# Adding products in bulk

**Admin → Bulk upload** adds or updates many products at once from a spreadsheet, together with their photos.

1. Download the template from the Bulk upload page (`/templates/product-upload-template.csv`) and open it in Excel, Numbers or Google Sheets.
2. Fill in one row per product. Put all its photos in one folder.
3. Save as **CSV** (Excel: *CSV UTF-8*).
4. On the Bulk upload page, choose the CSV and the photos, then **Check spreadsheet**.
5. When the preview says *Ready to import*, click **Import**. Nothing is saved while any row has a problem.

## Columns

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
| `sku` | yes | `ESS-TRK-BLK-01` | Your own code for the item: letters, numbers, `.` `-` `_` `/`. Uploading the same SKU again **updates** that product. |
| `name` | new products | `Essentials Relaxed Tracksuit - Black` | |
| `brand` | | `Fear of God Essentials` | |
| `category` | new products | `Tracksuits` | Everyday names work: *T-shirts, Tees, Hoodies, Jumpers, Tracksuits, Joggers, Trainers, Sneakers, Jackets, Bags, Perfume*… The preview warns if a category is not in one of the shop's collections (Clothing, Footwear, Accessories, Fragrances). |
| `price` | new products | `185.00` | In pounds; `£` and commas are fine. |
| `stock` | new products | `6` | Whole number. |
| `sizes` | | `S\|M\|L\|XL` | Separate with `\|`. Leave empty for one-size items. |
| `colour` | | `Black` | |
| `material` | | `Cotton blend` | |
| `description` | | | |
| `images` | | `trk-front.jpg\|trk-back.jpg` | Photo file names (choose those files with the spreadsheet) or `https://` links, separated by `\|`. The first photo is the main one. |
| `active` | | `yes` | `no` hides the product from the shop. |

Columns can be in any order, and unknown columns are ignored.

**Updating stock or prices:** a sheet with only the `sku` and `stock` columns (or `sku` and `price`) changes just those fields on existing products. Columns that are not in the sheet are left alone, but an empty cell in a column that *is* there clears that field.

## Photos

- JPEG, PNG or WebP, up to 15 MB each. On iPhone, choosing photos in Safari converts them to JPEG automatically.
- Each photo is resized to at most 1600 px and saved as WebP. Location and camera data (EXIF/GPS) are removed.
- Photos can also be added, reordered (*Make main*) or removed one product at a time in **Admin → Products → Edit**.
- Only use photos you took or have permission to use. Photos copied from other retailers' websites belong to them or to the brand.

## Limits

Up to 1,000 rows and 2 MB per spreadsheet; split larger catalogues into several files. Stock is per product, not per size.
