import { categories, services, servicesByCategory } from "@/config/services";
import { searchIndex } from "@/lib/catalog";
import { Container } from "./Container";
import { CategoryFilter } from "./CategoryFilter";
import { CustomRequestCard, ProductCard } from "./ProductCard";
import { ServiceSearch } from "./ServiceSearch";

export function ServiceCatalogue() {
  const chips = categories.map((c) => ({ id: c.id, shortName: c.shortName, icon: c.icon, count: servicesByCategory(c.id).length }));
  return (
    <section id="services" aria-labelledby="services-title" className="py-14 sm:py-20">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="services-title" className="text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl lg:text-[2.75rem]">
            What does your home need?
          </h2>
          <div className="w-full lg:max-w-md">
            <ServiceSearch items={searchIndex} />
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <CategoryFilter chips={chips} total={services.length}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
              {services.map((s) => (
                <li
                  key={s.slug}
                  data-category={s.category}
                  className={`animate-[card-in_0.4s_var(--ease-standard)_both] ${s.category === "other" ? "col-span-full" : ""}`}
                >
                  {s.category === "other" ? <CustomRequestCard /> : <ProductCard service={s} />}
                </li>
              ))}
            </ul>
          </CategoryFilter>
        </div>
      </Container>
    </section>
  );
}
