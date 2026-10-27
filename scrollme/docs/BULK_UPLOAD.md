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
| `department` | new products | `Men` | `Men`, `Women` or `Unisex` (shown under both). *Men's, Mens, Ladies, Womens* also work. The column can also be called `gender`. |
| `category` | new products | `Clothing` | One of the categories below, e.g. *Clothing, Shoes & Boots, Coats & Jackets*. A subcategory on its own works too (*Hoodies*, *Trainers*): the right category is filled in. |
| `subcategory` | | `Tracksuits` | Optional, from the list below. Everyday names work: *Tees, Hoodie, Jumpers, Sneakers, Puffer, Beanie, Perfume*… |
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

## Departments and categories

Products are shown under **Men** and **Women**, each with ten categories (the menus on the shop). Unisex products appear under both. The preview tells you if a category or subcategory does not exist for the department and lists the ones that do. The list lives in `src/taxonomy.json` and `backend/api/config/taxonomy.json` (keep the two files identical).

### Men

| Category | Subcategories |
| --- | --- |
| Clothing | T-shirts, Hoodies & sweatshirts, Tracksuits, Joggers, Jeans, Shirts, Polo shirts, Knitwear, Trousers & chinos, Shorts |
| Coats & Jackets | Puffer jackets, Parkas, Bomber jackets, Gilets, Rain jackets, Denim jackets, Leather jackets, Overcoats, Fleeces, Overshirts |
| Shoes & Boots | Trainers, Running shoes, Boots, Casual shoes, Smart shoes, Loafers, Sliders, Sandals, Flip-flops, Slippers |
| Activewear | Gym tops, Gym shorts, Joggers, Hoodies, Tracksuits, Track jackets, Base layers, Running, Swim shorts, Sports socks |
| Accessories | Caps, Hats & beanies, Belts, Wallets & cardholders, Sunglasses, Scarves, Gloves, Socks, Ties, Keyrings |
| Bags & Luggage | Backpacks, Crossbody bags, Bum bags, Holdalls & duffel bags, Tote bags, Laptop bags, Messenger bags, Wash bags, Suitcases |
| Watches & Jewellery | Watches, Smart watches, Chains & necklaces, Bracelets, Rings, Earrings, Pendants, Cufflinks |
| Suits & Tailoring | Suits, Blazers, Waistcoats, Formal shirts, Suit trousers, Ties & bow ties |
| Underwear & Nightwear | Boxers, Trunks, Briefs, Vests, Pyjamas, Loungewear, Dressing gowns, Thermals |
| Fragrance & Grooming | Aftershave & cologne, Deodorant, Gift sets, Skincare, Shaving, Beard care, Hair care, Body care |

### Women

| Category | Subcategories |
| --- | --- |
| Clothing | Tops, T-shirts, Hoodies & sweatshirts, Jeans, Jumpers & cardigans, Trousers, Co-ords, Shirts & blouses, Skirts, Jumpsuits & playsuits |
| Dresses | Mini dresses, Midi dresses, Maxi dresses, Party dresses, Casual dresses, Bodycon dresses, Shirt dresses, Wrap dresses, Knitted dresses, Occasion dresses |
| Coats & Jackets | Puffer jackets, Wool coats, Trench coats, Blazers, Denim jackets, Leather jackets, Gilets, Rain jackets, Faux fur & teddy, Parkas |
| Shoes & Boots | Trainers, Ankle boots, Knee-high boots, Slippers, Heels, Flats, Sandals, Loafers, Mules, Sliders & flip-flops |
| Activewear | Leggings, Sports bras, Gym tops, Joggers, Hoodies, Shorts, Tracksuits, Jackets, Running |
| Bags & Purses | Handbags, Shoulder bags, Crossbody bags, Tote bags, Backpacks, Clutch bags, Purses & cardholders, Bum bags, Luggage |
| Accessories | Sunglasses, Hats & beanies, Scarves, Belts, Hair accessories, Gloves, Socks & tights, Keyrings |
| Jewellery & Watches | Necklaces, Earrings, Bracelets, Rings, Anklets, Jewellery sets, Watches, Smart watches |
| Lingerie & Nightwear | Bras, Knickers, Lingerie sets, Shapewear, Pyjamas, Nightdresses, Loungewear, Dressing gowns, Swimwear |
| Fragrance & Beauty | Perfume, Body mist, Gift sets, Deodorant, Skincare, Make-up, Hair care, Body care |

## Photos

- JPEG, PNG or WebP, up to 15 MB each. On iPhone, choosing photos in Safari converts them to JPEG automatically.
- Each photo is resized to at most 1600 px and saved as WebP. Location and camera data (EXIF/GPS) are removed.
- Photos can also be added, reordered (*Make main*) or removed one product at a time in **Admin → Products → Edit**.
- Only use photos you took or have permission to use. Photos copied from other retailers' websites belong to them or to the brand.

## Limits

Up to 1,000 rows and 2 MB per spreadsheet; split larger catalogues into several files. Stock is per product, not per size.
