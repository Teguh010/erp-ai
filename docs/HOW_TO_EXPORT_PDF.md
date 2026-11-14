# Cara mengubah panduan karyawan menjadi PDF (untuk Trello)

File sumber: [`NEW_EMPLOYEE_GUIDE.md`](./NEW_EMPLOYEE_GUIDE.md)

Trello menerima lampiran **PDF**, **Markdown**, atau **Word**. PDF paling nyaman dibaca di mobile.

---

## Opsi 1 — VS Code / Cursor (paling mudah)

1. Install ekstensi **Markdown PDF** (yzane.markdown-pdf) di Cursor/VS Code.
2. Buka `docs/NEW_EMPLOYEE_GUIDE.md`.
3. Command Palette → **Markdown PDF: Export (pdf)**.
4. File PDF muncul di folder `docs/`.
5. Di Trello: buka card → **Attachment** → upload PDF.

---

## Opsi 2 — Pandoc (command line)

```bash
cd docs
pandoc NEW_EMPLOYEE_GUIDE.md -o NEW_EMPLOYEE_GUIDE.pdf --pdf-engine=pdflatex
```

Jika `pandoc` belum terpasang: https://pandoc.org/installing.html

Tanpa LaTeX, bisa ke HTML lalu print:

```bash
pandoc NEW_EMPLOYEE_GUIDE.md -s -o NEW_EMPLOYEE_GUIDE.html
open NEW_EMPLOYEE_GUIDE.html
# Browser → Print → Save as PDF
```

---

## Opsi 3 — Google Docs / Notion

1. Salin isi `NEW_EMPLOYEE_GUIDE.md` ke Google Docs atau Notion.
2. Rapikan heading jika perlu.
3. **File → Download → PDF** (Google Docs) atau export PDF (Notion).
4. Upload ke Trello.

---

## Opsi 4 — Lampirkan Markdown langsung

Trello mendukung upload `.md`. Karyawan yang nyaman dengan GitHub-style markdown bisa membuka file langsung.

---

## Saran struktur card Trello

| List | Card | Lampiran |
|------|------|----------|
| Dokumentasi | Panduan karyawan baru v1.0 | `NEW_EMPLOYEE_GUIDE.pdf` |
| Onboarding | Checklist hari 1–4 | Checklist di deskripsi card |

Checklist Trello (copy ke card):

- [ ] Hari 1 — Alur demo (PO + Sales)
- [ ] Hari 2 — Master bahan + stok
- [ ] Hari 3 — Produk jadi + BOM + produksi
- [ ] Hari 4 — Sales full flow + Movements audit