# pdf-converter-invoice-generator

Offline-first **Bank Statement to Invoice Generator** built with Next.js, TypeScript, and IndexedDB.

Upload bank transaction CSV files, manage transactions at scale, and generate professional PDF invoices — all in the browser with no backend required.

## Features

- **CSV Upload** — Drag & drop or file picker; automatic column mapping for non-standard headers
- **Duplicate Detection** — Skips duplicates by transaction ID, reference, date, amount, and description
- **Transaction Management** — Search, filter, sort, paginate, bulk delete, JSON/CSV export
- **PDF Invoices** — Generate single or bulk invoices (one PDF for all selected transactions)
- **Invoice History** — Preview, re-download, and delete past invoices
- **Settings** — Company branding, logo, watermark, currency, theme, backup/restore
- **Dashboard** — Stats cards and monthly debit/credit charts
- **Offline** — All data stored locally in IndexedDB via Dexie.js

## Tech Stack

- Next.js 15+ (App Router)
- TypeScript, Tailwind CSS, shadcn/ui
- Dexie.js (IndexedDB), Zustand, TanStack Table/Virtual
- PapaParse, pdf-lib, react-dropzone, date-fns, recharts

## Getting Started

```bash
cd statement-invoice
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supported CSV Formats

### Merchant / Payment Gateway (primary)

Auto-detected when columns include `Transaction_ID`, `Transaction_Date`, `Merchant_Name`, and `Amount`.

Typical source: Paytm / PTYES merchant settlement exports.

| Field | CSV Column |
|-------|------------|
| Date | `Transaction_Date` |
| Credit | `Amount` (ACQUIRING transactions) |
| Debit | `Amount` (REFUND transactions) |
| Transaction ID | `Transaction_ID` |
| Reference | `RRN`, `Bank_Transaction_ID`, or `Order_ID` |
| Description | Built from `Payment_Mode`, `Customer_VPA`, `Merchant_Name` |

Only rows with `Status = SUCCESS` are imported. Running balance is computed automatically.

Sample: `fixtures/sample-merchant.csv`

### Standard Bank Statement

```csv
Date,Description,Debit,Credit,Balance,Reference,Transaction ID
01/01/2026,Amazon Purchase,500,,10000,ABC123,TXN001
```

Sample: `fixtures/sample-bank.csv`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `/` | Go to transactions search |

## Backup & Restore

Go to **Settings → Backup** to export or import the full database as JSON (includes PDF blobs).

## Project Structure

```
app/           # Next.js pages
components/    # Shared UI and layout
features/      # upload, transactions, invoices, pdf, settings
lib/           # csv, pdf, database, utils
models/        # Zod schemas and types
hooks/         # React hooks
store/         # Zustand stores
fixtures/      # Sample CSV data
```

## License

Private — personal use.
