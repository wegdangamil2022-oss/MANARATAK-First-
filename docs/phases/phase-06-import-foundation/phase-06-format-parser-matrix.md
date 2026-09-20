# Phase 06: Format Parser Matrix

## 1. Purpose of P3 Parser Strategy
The goal of the Phase 3 (P3) parser strategy is to enable streaming, memory-efficient parsing of large import files without loading the entire payload into memory. This approach allows for highly scalable data ingestion while ensuring row-level error isolation and robust partial-success handling.

## 2. Format Matrix

### CSV
*   **Extensions / MIME:** `.csv` / `text/csv`
*   **Initial Support Level:** High (Primary focus)
*   **Streaming Strategy:** Chunked stream parsing
*   **Row Boundary Behavior:** Newline/CRLF isolated
*   **Row Error Isolation:** High (Malformed rows are isolated to the current line, allowing subsequent rows to parse successfully)
*   **Memory Risk:** Low (Highly streamable)
*   **Recommended Parser Dependency:** `csv-parse` (Deferred)

### JSON
*   **Extensions / MIME:** `.json` / `application/json`
*   **Initial Support Level:** Medium
*   **Streaming Strategy:** Token-based streaming (e.g., parsing an array of objects element-by-element). Production root-array JSON must use streaming token parsing, while inline JSON remains limited by the existing 90KB guard.
*   **Row Boundary Behavior:** Object boundaries within the root array
*   **Row Error Isolation:** Low to Medium (A severe syntax error might corrupt the rest of the stream, though advanced stream parsers attempt recovery)
*   **Memory Risk:** High (If a naive `JSON.parse` is used on the entire file) / Low (If properly streamed)
*   **Recommended Parser Dependency:** `stream-json` (Deferred)

### NDJSON (Newline Delimited JSON)
*   **Extensions / MIME:** `.ndjson`, `.jsonl` / `application/x-ndjson`
*   **Initial Support Level:** High (Secondary focus)
*   **Streaming Strategy:** Line-by-line stream reading
*   **Row Boundary Behavior:** Newline isolated
*   **Row Error Isolation:** High (Syntax errors are isolated to a single line)
*   **Memory Risk:** Low
*   **Recommended Parser Dependency:** Native readline or simple stream splitter (Deferred)

### XML
*   **Extensions / MIME:** `.xml` / `application/xml`, `text/xml`
*   **Initial Support Level:** Low
*   **Streaming Strategy:** SAX parser / element event streams
*   **Row Boundary Behavior:** Defined element tags (e.g., `<record>`)
*   **Row Error Isolation:** Medium
*   **Memory Risk:** High (If DOM parsing is used) / Low (If SAX stream parsing is used)
*   **Recommended Parser Dependency:** `sax` or `xml-stream` (Deferred)

### XLSX
*   **Extensions / MIME:** `.xlsx` / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
*   **Initial Support Level:** Medium
*   **Streaming Strategy:** Cell/Row event reading
*   **Row Boundary Behavior:** Spreadsheet row
*   **Row Error Isolation:** High
*   **Memory Risk:** Medium to High (Depending heavily on the library's streaming implementation and zip extraction overhead. Because ZIP/container parsing can add memory overhead, XLSX is not the first performance target; CSV and NDJSON are first.)
*   **Recommended Parser Dependency:** `exceljs` or `xlsx` (Deferred)

## 3. Explicit Rule
**P3B is documentation only.** No parser dependency is installed or implemented at this stage. Parser dependencies remain explicitly deferred until their specific implementation slices.

## 4. Parser Contract Preview
Future implementation will introduce the following core contracts:
*   `IImportStreamParser`: Interface for format-specific streaming parsers.
*   `ParsedImportRow`: Standardized output for a single successfully parsed row.
*   `ImportParseError`: Standardized error representation for a failed row parse.
*   `ImportParserRegistry`: Registry to resolve the correct parser based on file format/MIME type.

## 5. Error Handling Policy
*   **Row-Level Errors:** A malformed row should not fail the entire batch when the row boundary is recoverable (e.g., in CSV or NDJSON). The error should be isolated, logged, and the row skipped or sent to a DLQ.
*   **File/Header Errors:** A malformed file, missing required headers, or unrecoverable syntax errors can and should fail the batch before staging begins.

## 6. Performance Targets
*   **10K rows:** First target for streaming implementation.
*   **100K rows:** Second target, validating memory stability.
*   **1M rows:** Only targeted after artifact flow, chunking, and bulk staging are fully complete.

## 7. Forbidden Behavior
*   No loading the entire large file into memory.
*   No AI parsing in P3.
*   No crawler/source acquisition in P3.
*   No Phase 25.
*   No domain promotion or publication in P3. Domain match/merge remains owned by downstream phases.
