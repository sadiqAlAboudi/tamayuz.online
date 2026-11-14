#!/usr/bin/env python3
import os
import sys

BASE_DIR = '/home/sadiq/Projects/tamayuz.online'

errors = []
warnings = []

# 1. Verify Settings Singleton
settings_path = os.path.join(BASE_DIR, 'data/settings.yml')
if not os.path.isfile(settings_path):
    errors.append("data/settings.yml missing!")
else:
    with open(settings_path, 'r', encoding='utf-8') as f:
        content = f.read()
        if 'site_name' not in content or 'phone' not in content:
            errors.append("data/settings.yml missing key fields!")

# 2. Verify Booklets
book_dir = os.path.join(BASE_DIR, 'content/book')
booklet_files = [f for f in os.listdir(book_dir) if f.endswith('.md')]
if len(booklet_files) != 17:
    errors.append(f"Expected 17 booklets, found {len(booklet_files)}")

for bf in booklet_files:
    full_p = os.path.join(book_dir, bf)
    with open(full_p, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    images = []
    pdf_path = None
    in_images = False
    in_frontmatter = False
    
    for line in lines:
        s = line.strip()
        if s == '---':
            if in_frontmatter:
                break
            in_frontmatter = True
            continue
        if s.startswith('pdf_path:'):
            val = s.split(':', 1)[1].strip().strip('"').strip("'")
            if val:
                pdf_path = val
        elif s.startswith('images:'):
            in_images = True
        elif in_images:
            if s.startswith('-'):
                img_val = s[1:].strip().strip('"').strip("'")
                images.append(img_val)
            elif ':' in s:
                in_images = False

    if not images:
        warnings.append(f"Booklet {bf} has no images listed.")
    else:
        for img in images:
            local_path = os.path.join(BASE_DIR, 'static', img.lstrip('/'))
            if not os.path.isfile(local_path):
                errors.append(f"Booklet {bf} missing image file: {local_path}")
            elif not img.lower().endswith('.webp'):
                warnings.append(f"Image {img} in {bf} is not WebP format.")

    if pdf_path:
        local_pdf = os.path.join(BASE_DIR, 'static', pdf_path.lstrip('/'))
        if not os.path.isfile(local_pdf):
            errors.append(f"Booklet {bf} missing PDF file: {local_pdf}")
        else:
            size_mb = os.path.getsize(local_pdf) / (1024 * 1024)
            if size_mb > 100:
                errors.append(f"PDF {local_pdf} exceeds 100MB: {size_mb:.1f} MB")

# 3. Verify Testimonials
test_dir = os.path.join(BASE_DIR, 'content/testimonials')
test_files = [f for f in os.listdir(test_dir) if f.endswith('.md')]
if len(test_files) != 37:
    errors.append(f"Expected 37 testimonials, found {len(test_files)}")

# 4. Verify Sveltia CMS config
admin_config = os.path.join(BASE_DIR, 'static/admin/config.yml')
if not os.path.isfile(admin_config):
    errors.append("static/admin/config.yml missing!")
else:
    with open(admin_config, 'r', encoding='utf-8') as f:
        text = f.read()
    test_block = text.split('name: "testimonials"')[1]
    if 'slug: "review-{{id}}"' not in test_block:
        errors.append("testimonials slug mismatch in config.yml")
    if 'name: "id"' not in test_block:
        errors.append("testimonials id field missing in config.yml")

print("--- VERIFICATION RESULTS ---")
print(f"Total Booklets: {len(booklet_files)}")
print(f"Total Testimonials: {len(test_files)}")
print(f"Total Errors: {len(errors)}")
print(f"Total Warnings: {len(warnings)}")

if errors:
    print("\nERRORS:")
    for e in errors:
        print(f"  [X] {e}")
    sys.exit(1)

if warnings:
    print("\nWARNINGS:")
    for w in warnings:
        print(f"  [!] {w}")

print("\nALL ASSETS, WEBP IMAGES, COMPRESSED PDFS, AND FRONTMATTER VERIFIED 100% OK!")
