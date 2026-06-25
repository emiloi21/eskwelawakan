# Test Login Credentials & Module Testing Guide

Copy this file to `test-login-creds.md` for local development. The real credentials file is gitignored.

All accounts are active for school year **2025-2026**.  
Base URL (dev): `http://localhost:5173`  
API: `http://localhost:8000`

After seeding (`php artisan migrate --seed` or `php artisan db:seed --class=TestDataSeeder`), use the accounts defined in `backend/database/seeders/StaffAccountsSeeder.php` and `TestDataSeeder.php`.

## System / Internal Users

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `admin` | *(see seeder)* | Administrator | Main admin panel |
| `registrar` | *(see seeder)* | Registrar | Enrollment workflows |
| `accounting` | *(see seeder)* | Accounting Staff | Billing / GL |
| `cashier` | *(see seeder)* | Cashier | Receipts |
| `hr` | *(see seeder)* | HR | Personnel / payroll |
| `teacher` | *(see seeder)* | Teacher | Teacher portal |
| `student` | *(see seeder)* | Student | Student portal |
| `parent` | *(see seeder)* | Parent | Parent portal |

See `StaffAccountsSeeder.php` for the canonical password values used in your local database.
