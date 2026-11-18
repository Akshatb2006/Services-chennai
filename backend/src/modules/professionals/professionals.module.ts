import { Module } from "@nestjs/common";
import { DocumentStorage, UnconfiguredDocumentStorage } from "./document-storage.js";
import { ProfessionalsController } from "./professionals.controller.js";
import { ProfessionalsService } from "./professionals.service.js";

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, { provide: DocumentStorage, useClass: UnconfiguredDocumentStorage }],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
