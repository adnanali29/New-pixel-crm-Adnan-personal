-- ============================================================
-- PIXEL CRM - Neon PostgreSQL Schema (Idempotent)
-- Run this in your Neon SQL Editor
-- ============================================================

-- 1. SERVICES & SUB-CATEGORIES
CREATE TABLE IF NOT EXISTS services (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name        text NOT NULL,
    hsn_code    text,
    created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sub_categories (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id  uuid REFERENCES services(id) ON DELETE CASCADE,
    name        text NOT NULL,
    created_at  timestamptz DEFAULT now() NOT NULL
);

-- 2. ENQUIRIES
CREATE TABLE IF NOT EXISTS enquiries (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date                date DEFAULT CURRENT_DATE,
    contact_name        text NOT NULL,
    company_name        text NOT NULL,
    mobile_number       text,
    website             text,
    email               text,
    company_address     text,
    gst_number          text,
    gst_slab            numeric DEFAULT 0,
    tax_type            text CHECK (tax_type IN ('Inclusive', 'Exclusive')) DEFAULT 'Exclusive',
    country             text DEFAULT 'India',
    state               text,
    description         text,
    status              text DEFAULT 'active' CHECK (status IN ('active', 'dead')),
    converted_to_quote  boolean DEFAULT false,
    created_at          timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiry_services (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    enquiry_id      uuid REFERENCES enquiries(id) ON DELETE CASCADE,
    service_id      uuid REFERENCES services(id) ON DELETE SET NULL,
    sub_service_id  uuid REFERENCES sub_categories(id) ON DELETE SET NULL
);

-- 3. QUOTATIONS
CREATE TABLE IF NOT EXISTS quotations (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    enquiry_id          uuid REFERENCES enquiries(id) ON DELETE SET NULL,
    quote_number        text UNIQUE NOT NULL,
    date                date DEFAULT CURRENT_DATE,
    company_name        text NOT NULL,
    contact_name        text NOT NULL,
    email               text,
    mobile_number       text,
    website             text,
    company_address     text,
    gst_number          text,
    gst_slab            numeric DEFAULT 0,
    tax_type            text CHECK (tax_type IN ('Inclusive', 'Exclusive')) DEFAULT 'Exclusive',
    country             text DEFAULT 'India',
    state               text,
    base_amount         numeric DEFAULT 0,
    gst_amount          numeric DEFAULT 0,
    total_amount        numeric DEFAULT 0,
    status              text DEFAULT 'active' CHECK (status IN ('active', 'dead')),
    converted_to_order  boolean DEFAULT false,
    created_at          timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id     uuid REFERENCES quotations(id) ON DELETE CASCADE,
    service_id       uuid,
    sub_service_id   uuid,
    service_name     text,
    sub_service_name text,
    hsn_code         text,
    quantity         numeric DEFAULT 1,
    base_price       numeric DEFAULT 0,
    gst_rate         numeric DEFAULT 0,
    gst_amount       numeric DEFAULT 0,
    total_price      numeric DEFAULT 0
);

-- 4. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id    uuid REFERENCES quotations(id) ON DELETE SET NULL,
    order_number    text UNIQUE NOT NULL,
    date            date DEFAULT CURRENT_DATE,
    company_name    text NOT NULL,
    contact_name    text NOT NULL,
    poc_name        text,
    email           text,
    mobile_number   text,
    website         text,
    company_address text,
    gst_number      text,
    gst_slab        numeric DEFAULT 0,
    tax_type        text CHECK (tax_type IN ('Inclusive', 'Exclusive')) DEFAULT 'Exclusive',
    country         text DEFAULT 'India',
    state           text,
    total_amount    numeric DEFAULT 0,
    base_amount     numeric DEFAULT 0,
    gst_amount      numeric DEFAULT 0,
    paid_amount     numeric DEFAULT 0,
    pending_amount  numeric DEFAULT 0,
    refund_due      numeric DEFAULT 0,
    refund_paid     numeric DEFAULT 0,
    po_file         text,
    po_file_name    text,
    status          text DEFAULT 'active' CHECK (status IN ('active', 'dead')),
    created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS order_services (
    id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id         uuid REFERENCES orders(id) ON DELETE CASCADE,
    service_id       uuid,
    sub_service_id   uuid,
    service_name     text,
    sub_service_name text,
    hsn_code         text,
    quantity         numeric DEFAULT 1,
    base_price       numeric DEFAULT 0,
    gst_rate         numeric DEFAULT 0,
    gst_amount       numeric DEFAULT 0,
    total_price      numeric DEFAULT 0,
    status           text DEFAULT 'active' CHECK (status IN ('active', 'canceled'))
);

CREATE TABLE IF NOT EXISTS payments (
    id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id  uuid REFERENCES orders(id) ON DELETE CASCADE,
    amount    numeric NOT NULL,
    date      timestamptz DEFAULT now(),
    type      text CHECK (type IN ('full', 'partial')),
    version   text,
    notes     text
);

CREATE TABLE IF NOT EXISTS refund_payments (
    id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id  uuid REFERENCES orders(id) ON DELETE CASCADE,
    amount    numeric NOT NULL,
    date      timestamptz DEFAULT now(),
    type      text CHECK (type IN ('full', 'partial')),
    notes     text
);

-- 5. MARKET RESEARCH
CREATE TABLE IF NOT EXISTS market_research (
    id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name   text NOT NULL,
    website        text,
    phone          text,
    email          text,
    description    text,
    pitch_planning text,
    created_at     timestamptz DEFAULT now() NOT NULL
);

-- 6. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    id                       text PRIMARY KEY DEFAULT 'app_settings',
    password                 text,
    quote_pdf_settings       jsonb,
    po_pdf_settings          jsonb,
    pi_pdf_settings          jsonb,
    tax_invoice_pdf_settings jsonb,
    updated_at               timestamptz DEFAULT now()
);

-- 7. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email     text UNIQUE NOT NULL,
    password  text NOT NULL,
    full_name text,
    role      text DEFAULT 'admin'
);

-- 8. INITIAL ADMIN USER (adnan@gmail.com / abc@12345)
INSERT INTO profiles (email, password, full_name, role)
VALUES ('adnan@gmail.com', 'abc@12345', 'Adnan', 'admin')
ON CONFLICT (email) DO UPDATE SET
    password  = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role;

-- 9. SETTINGS INITIAL DATA
INSERT INTO settings (id, password, quote_pdf_settings, po_pdf_settings, pi_pdf_settings, tax_invoice_pdf_settings) 
VALUES (
  'app_settings',
  'abc@12345',
  '{"heading": "QUOTATION", "companyName": "Pixel Web Pages"}',
  '{"heading": "PURCHASE ORDER", "companyName": "Pixel Web Pages"}',
  '{"heading": "PROFORMA INVOICE", "companyName": "Pixel Web Pages"}',
  '{"heading": "TAX INVOICE", "companyName": "Pixel Web Pages"}'
) ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, updated_at = now();
