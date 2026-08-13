#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {assertPromotionReceipt,catalogDiff,sha256,validateRecord} from "./catalog-core.mjs";

const [command,...args]=process.argv.slice(2),read=file=>JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));
const write=(file,value)=>fs.writeFileSync(path.resolve(file),JSON.stringify(value,null,2)+"\n");
if(command==="validate"){
  const [catalogFile,sourceRegistryFile,reportFile]=args,catalog=read(catalogFile),registry=read(sourceRegistryFile),sourceIds=new Set(registry.sources.map(source=>source.sourceId)),results=catalog.objects.map(record=>({pcsObjectId:record.pcsObjectId,...validateRecord(record,{sourceIds})})),report={schemaVersion:"pcs-known-object-validation-v1",catalogChecksum:sha256(catalog),objectCount:catalog.objects.length,validCount:results.filter(item=>item.valid).length,rejectedCount:results.filter(item=>!item.valid).length,results};write(reportFile,report);if(report.rejectedCount)process.exitCode=1;
}else if(command==="diff"){
  const [previousFile,candidateFile,reportFile]=args,previous=read(previousFile),candidate=read(candidateFile);write(reportFile,{schemaVersion:"pcs-known-object-diff-v1",previousChecksum:sha256(previous),candidateChecksum:sha256(candidate),...catalogDiff(previous,candidate)});
}else if(command==="promote"){
  const [candidateFile,validationFile,diffFile,receiptFile,productionFile]=args,candidate=read(candidateFile),validation=read(validationFile),diff=read(diffFile),receipt=read(receiptFile);assertPromotionReceipt({candidate,validation,diff,receipt});if(validation.rejectedCount||diff.unresolvedCount)throw new Error("Promotion is blocked by rejected or unresolved records");write(productionFile,{...candidate,status:"PUBLISHED",publishedAt:receipt.decisionDate,reviewReceiptChecksum:sha256(receipt)});
}else{
  console.error("Usage: catalog-pipeline.mjs validate <catalog> <sources> <report> | diff <previous> <candidate> <report> | promote <candidate> <validation> <diff> <receipt> <production>");process.exitCode=2;
}
