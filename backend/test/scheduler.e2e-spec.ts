import { addDays, todayInIndia } from "@homecare/contracts";
import { JobQueue, LOCK_SECONDS, LostClaimError } from "../src/modules/scheduler/job-queue.js";
import { ReminderJobs } from "../src/modules/scheduler/reminder-jobs.js";
import { RequestWorkflow } from "../src/modules/requests/request-workflow.js";
import { createTestApp, nextIp, type TestContext } from "./helpers.js";
import { customerRequest, seedProfessional, staffSession, uniquePhone } from "./admin-helpers.js";

describe("Reminder scheduler (PostgreSQL job queue)", () => {
  let t: TestContext;
  let reminders: ReminderJobs;
  let queue: JobQueue;
  beforeAll(async () => {
    t = await createTestApp();
    reminders = t.app.get(ReminderJobs);
    queue = t.app.get(JobQueue);
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await t.reset();
    await t.prisma.$executeRawUnsafe('TRUNCATE "scheduled_jobs", "operations_alerts" CASCADE');
  });
  afterEach(() => vi.restoreAllMocks());

  const JOB_DATE = () => addDays(todayInIndia(), 3);
  /** Moves the test clock to 09:01 IST on the day before `date` (when its reminder is due). */
  const atReminderTime = (date: string) => {
    t.clock.offsetMs = new Date(`${addDays(date, -1)}T03:31:00Z`).getTime() - Date.now();
  };

  /** A professional with a Pro app account (linked user). */
  async function appPro(name = "Lakshmi") {
    const pro = await seedProfessional(t, { name });
    const user = await t.prisma.user.create({ data: { phone: uniquePhone("94000"), role: "professional" } });
    return t.prisma.professional.update({ where: { id: pro.id }, data: { userId: user.id } });
  }

  async function confirmedJob(opts: { pro?: { id: string; userId?: string | null }; date?: string; ops?: { auth: string } } = {}) {
    const ops = opts.ops ?? (await staffSession(t, "operations_admin"));
    const pro = opts.pro ?? (await appPro());
    const c = await customerRequest(t);
    const date = opts.date ?? JOB_DATE();
    await t.http().post(`/admin/requests/${c.request.id}/assign`).set("authorization", ops.auth).send({ professionalId: pro.id, date, slot: "morning" }).expect(200);
    await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", ops.auth).send({}).expect(200);
    return { ops, pro, c, date };
  }

  const reminderCount = (userId?: string | null) => t.prisma.notification.count({ where: { type: "job_reminder", ...(userId && { userId }) } });

  it("creates exactly one reminder per job, sends it once when due, in the Pro app only", async () => {
    const { pro, c, date } = await confirmedJob();
    expect(await reminders.enqueue()).toBe(1);
    expect(await reminders.enqueue()).toBe(0); // idempotent sweep

    expect((await reminders.run("w1")).claimed).toBe(0); // not due yet
    atReminderTime(date);
    expect(await reminders.run("w1")).toMatchObject({ claimed: 1, sent: 1 });
    expect(await reminders.run("w1")).toMatchObject({ claimed: 0, sent: 0 });

    const n = await t.prisma.notification.findFirstOrThrow({ where: { type: "job_reminder" } });
    expect(n).toMatchObject({ userId: pro.userId, audience: "professional", requestId: c.request.id });
    const job = await t.prisma.scheduledJob.findFirstOrThrow();
    expect(job).toMatchObject({ status: "sent", notificationId: n.id, attempts: 1, lockedBy: null });
    // Never shown to the customer.
    expect((await t.http().get("/notifications").set("authorization", c.customer.auth)).body.data.map((x: { type: string }) => x.type)).not.toContain("job_reminder");
  });

  it("doesn't send if the professional was already reminded for this job (e.g. by the old timer)", async () => {
    const { pro, c, date } = await confirmedJob();
    atReminderTime(date);
    await t.prisma.notification.create({ data: { userId: pro.userId!, audience: "professional", type: "job_reminder", title: "Job tomorrow", body: "legacy", requestId: c.request.id, createdAt: t.clock.now() } });
    expect(await reminders.run("w1")).toMatchObject({ skipped: 1, sent: 0 });
    expect((await t.prisma.scheduledJob.findFirstOrThrow()).outcome).toBe("Already reminded");
    expect(await reminderCount()).toBe(1);
  });

  it("never double-sends when several workers run at once", async () => {
    const ops = await staffSession(t, "operations_admin");
    const pros = await Promise.all([1, 2, 3, 4, 5].map((i) => appPro(`Pro ${i}`)));
    for (const pro of pros) await confirmedJob({ ops, pro });
    atReminderTime(JOB_DATE());
    const results = await Promise.all(["w1", "w2", "w3", "w4"].map((w) => reminders.run(w)));
    expect(results.reduce((n, r) => n + r.sent, 0)).toBe(5);
    expect(results.reduce((n, r) => n + r.claimed, 0)).toBe(5);
    expect(await reminderCount()).toBe(5);
    expect(await t.prisma.scheduledJob.count({ where: { status: "sent" } })).toBe(5);
  });

  it("recovers jobs from a worker that died mid-run, and fences the dead worker out", async () => {
    const { date } = await confirmedJob();
    await reminders.enqueue();
    atReminderTime(date);
    const [stuck] = await queue.claim("dead-worker", "job_reminder"); // claimed, then the process "crashes"
    expect(stuck.status).toBe("processing");
    expect((await reminders.run("w2")).claimed).toBe(0); // lock still valid

    t.clock.advance(LOCK_SECONDS + 1);
    expect(await reminders.run("w2")).toMatchObject({ claimed: 1, sent: 1 });
    // The dead worker coming back can't overwrite the result.
    await expect(t.prisma.$transaction((tx) => queue.markSent(tx, stuck, "dead-worker", stuck.id))).rejects.toBeInstanceOf(LostClaimError);
    expect(await reminderCount()).toBe(1);
    expect((await t.prisma.scheduledJob.findFirstOrThrow()).attempts).toBe(2);
  });

  it("retries transient failures with backoff, then sends", async () => {
    const { date } = await confirmedJob();
    atReminderTime(date);
    const workflow = t.app.get(RequestWorkflow);
    vi.spyOn(workflow, "notifyProfessional").mockRejectedValueOnce(new Error("database blip"));
    expect(await reminders.run("w1")).toMatchObject({ claimed: 1, retried: 1, sent: 0 });
    const job = await t.prisma.scheduledJob.findFirstOrThrow();
    expect(job).toMatchObject({ status: "pending", lastError: "database blip", attempts: 1 });
    expect(job.runAt.getTime()).toBeGreaterThan(t.clock.now().getTime());
    expect(await reminderCount()).toBe(0); // the failed attempt left nothing behind

    expect((await reminders.run("w1")).claimed).toBe(0); // backing off
    t.clock.advance(61);
    expect(await reminders.run("w1")).toMatchObject({ sent: 1 });
    expect(await reminderCount()).toBe(1);
  });

  it("marks a job failed after max attempts and audits it", async () => {
    const { date } = await confirmedJob();
    atReminderTime(date);
    vi.spyOn(t.app.get(RequestWorkflow), "notifyProfessional").mockRejectedValue(new Error("provider down"));
    let last;
    for (let i = 0; i < 5; i++) {
      last = await reminders.run("w1");
      t.clock.advance(3601);
    }
    expect(last).toMatchObject({ failed: 1 });
    expect(await t.prisma.scheduledJob.findFirstOrThrow()).toMatchObject({ status: "failed", attempts: 5, lastError: "provider down" });
    expect(await t.prisma.auditLog.count({ where: { action: "reminder.failed" } })).toBe(1);
    expect((await reminders.run("w1")).claimed).toBe(0);
    expect(await reminderCount()).toBe(0);
  });

  it("skips the reminder when the job is reassigned, and reminds the new professional after re-confirmation", async () => {
    const { ops, pro: oldPro, c, date } = await confirmedJob();
    await reminders.enqueue();
    const newPro = await appPro("Selvi");
    await t.http().post(`/admin/requests/${c.request.id}/reassign`).set("authorization", ops.auth).send({ professionalId: newPro.id, date, slot: "morning", reason: "Swap" }).expect(200);
    await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", ops.auth).send({}).expect(200);
    atReminderTime(date);
    const r = await reminders.run("w1");
    expect(r).toMatchObject({ sent: 1, skipped: 1 });
    expect(await reminderCount(oldPro.userId)).toBe(0);
    expect(await reminderCount(newPro.userId)).toBe(1);
    const skipped = await t.prisma.scheduledJob.findFirstOrThrow({ where: { status: "skipped" } });
    expect(skipped.outcome).toBe("Assignment is reassigned");
    expect(await t.prisma.auditLog.count({ where: { action: "reminder.skipped" } })).toBe(1);
  });

  it("skips the reminder when the request is cancelled", async () => {
    const { c, date } = await confirmedJob();
    await reminders.enqueue();
    await t.http().post(`/requests/${c.request.id}/cancel`).set("authorization", c.customer.auth).send({}).expect(200);
    atReminderTime(date);
    expect(await reminders.run("w1")).toMatchObject({ skipped: 1, sent: 0 });
    expect(await reminderCount()).toBe(0);
  });

  it("follows a reschedule: the old date is skipped, the new date gets one reminder", async () => {
    const { ops, c, date } = await confirmedJob();
    await reminders.enqueue();
    const newDate = addDays(date, 2);
    await t.http().post(`/admin/requests/${c.request.id}/reschedule`).set("authorization", ops.auth).send({ date: newDate, slot: "morning", reason: "Customer asked" }).expect(200);
    atReminderTime(date);
    expect(await reminders.run("w1")).toMatchObject({ skipped: 1, sent: 0 });
    atReminderTime(newDate);
    expect(await reminders.run("w1")).toMatchObject({ sent: 1 });
    expect(await t.prisma.scheduledJob.count()).toBe(2);
    expect(await reminderCount()).toBe(1);
  });

  it("skips professionals without a Pro app account and unconfirmed jobs", async () => {
    const ops = await staffSession(t, "operations_admin");
    const noApp = await seedProfessional(t);
    await confirmedJob({ ops, pro: noApp });
    const c2 = await customerRequest(t);
    await t.http().post(`/admin/requests/${c2.request.id}/assign`).set("authorization", ops.auth).send({ professionalId: (await appPro()).id, date: JOB_DATE(), slot: "evening" }).expect(200);
    expect(await reminders.enqueue()).toBe(1); // only the confirmed one is queued
    atReminderTime(JOB_DATE());
    expect(await reminders.run("w1")).toMatchObject({ skipped: 1, sent: 0 });
    expect((await t.prisma.scheduledJob.findFirstOrThrow()).outcome).toBe("Professional has no Pro app account");
    expect(nextIp()).toBeTruthy();
  });
});
