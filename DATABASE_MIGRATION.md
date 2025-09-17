# Database Schema Migration Guide

## Overview
This migration converts the appointment data storage from a single JSONB array approach to individual records for better performance and to avoid Unicode escape sequence errors.

## Changes Made

### Old Schema
- `shared_appointments` table with JSONB `data` field storing entire arrays
- Problems: Unicode errors with large Excel files, performance issues, difficult to query

### New Schema
- `appointment_datasets` table: Tracks uploaded files/datasets
- `appointments` table: Individual appointment records
- Benefits: Better performance, no Unicode issues, easier to query and filter

## How to Apply Migration

### Step 1: Run the SQL Migration
Execute the SQL commands in `supabase_migration.sql` in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase_migration.sql`
4. Run the script

### Step 2: Update Your Code
The code has already been updated to work with the new schema:

- `saveAppointmentData()` - Now saves individual records instead of JSONB arrays
- `loadSharedData()` - Loads from new tables and transforms back to compatible format
- `clearSharedData()` - Clears both appointments and datasets tables

### Step 3: Test the Migration
1. Upload a new Excel file
2. Verify data is saved correctly
3. Check that data loads properly
4. Test the clear functionality

## Table Structure

### appointment_datasets
```sql
- id: UUID (primary key)
- name: TEXT (filename)
- uploaded_at: TIMESTAMP
- uploaded_by: UUID (user reference)
- uploaded_by_email: TEXT
- record_count: INTEGER
```

### appointments
```sql
- id: UUID (primary key)
- dataset_id: UUID (references appointment_datasets)
- user_name: TEXT (Χρήστης δημιουργίας)
- store_name: TEXT (Υποκατάστημα)
- creation_date: DATE (parsed from Greek format)
- creation_date_text: TEXT (original text)
- source_type: TEXT
- uploaded_by: UUID (user reference)
- uploaded_by_email: TEXT
- created_at: TIMESTAMP
```

## Benefits of New Schema

1. **Performance**: Individual records are faster to query than large JSONB arrays
2. **Unicode Safety**: No more escape sequence errors with large Excel files
3. **Queryability**: Can filter, sort, and aggregate data efficiently
4. **Scalability**: Better for large datasets
5. **Maintenance**: Easier to debug and maintain

## Rollback Plan
If needed, you can rollback by:
1. Keeping the old `shared_appointments` table (don't drop it initially)
2. Reverting the code changes
3. Testing with the old approach

## Testing Checklist
- [ ] Upload Excel file with Greek characters
- [ ] Verify no Unicode errors
- [ ] Check data loads correctly
- [ ] Test charts still work
- [ ] Verify clear functionality
- [ ] Test with multiple users
- [ ] Check performance with large files