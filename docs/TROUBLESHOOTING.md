# Troubleshooting Guide - School Year & Semester Management

## 🔧 Common Issues & Solutions

### Issue 1: Migration Script Won't Apply

**Symptom**: 
```
Error: Duplicate column name 'fy_start_date'
```

**Cause**: Columns already exist in the table

**Solutions**:
```sql
-- Check if columns exist
DESCRIBE school_year;

-- If they exist, you're good to go! No action needed.
-- If not, run the migration again.

-- Alternative: Check table structure
SHOW CREATE TABLE school_year;
```

---

### Issue 2: School Years Not Appearing in Dropdown

**Symptoms**:
- Empty dropdown
- No school years showing
- "-- Select School Year --" only option

**Causes**:
1. Database query returned null
2. No school years in database
3. Database connection issue

**Solutions**:

```php
// Check 1: Verify database connection
include('session.php'); // Should establish $conn

// Check 2: Query the database directly
$test_query = $conn->query("SELECT * FROM school_year");
if (!$test_query) {
    echo "Query failed: " . $conn->errorInfo()[2];
}

// Check 3: Verify data exists
$count = $conn->query("SELECT COUNT(*) as cnt FROM school_year")->fetch()['cnt'];
echo "School years in DB: " . $count;
```

**Manual Fix**:
```sql
-- Add test school year
INSERT INTO school_year (schoolYear, status, fy_start_date, fy_end_date)
VALUES ('2025-2026', 'Inactive', '2025-06-01', '2026-05-31');

-- Verify
SELECT * FROM school_year;
```

---

### Issue 3: Modal Not Opening/Appearing

**Symptoms**:
- Click "Manage School Years" but nothing happens
- Modal appears offscreen or hidden
- Partial modal visible

**Causes**:
1. Bootstrap not loaded
2. jQuery/JavaScript error
3. CSS issue
4. Z-index conflict

**Solutions**:

```html
<!-- Check 1: Verify Bootstrap is loaded -->
<!-- In browser DevTools Console, run: -->
<script>
console.log('Bootstrap:', typeof Bootstrap);
console.log('jQuery:', typeof jQuery);
</script>

<!-- Check 2: Review browser console for errors -->
<!-- Press F12 → Console tab → Look for red errors -->

<!-- Check 3: Verify scripts_files.php includes Bootstrap -->
<!-- Usually should have: -->
<!-- <link rel="stylesheet" href="...bootstrap.min.css"> -->
<!-- <script src="...bootstrap.min.js"></script> -->
```

**Manual Fix**:
```html
<!-- If Bootstrap is missing, add to school_preferences.php header -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.min.js"></script>
```

---

### Issue 4: "Invalid school year format" Error

**Symptoms**:
- Error message when adding school year
- Form validation fails

**Cause**: School year not in YYYY-YYYY format

**Solutions**:

```
Correct Format:  2025-2026 ✓
                 2024-2025 ✓
                 2026-2027 ✓

Wrong Format:    25-26     ✗
                 2025/2026 ✗
                 2025-26   ✗
                 2025      ✗
```

**Example Entry**:
```
School Year: 2025-2026
Year separator must be a hyphen (-)
Both parts must be 4 digits
```

---

### Issue 5: "End date must be after start date" Error

**Symptoms**:
- Error when adding or editing school year
- Fiscal dates don't save

**Causes**:
1. End Date same as Start Date
2. End Date before Start Date
3. Date format issue

**Solutions**:

```
Valid Example:
  Start: 2025-06-01
  End:   2026-05-31  ✓

Invalid Examples:
  Start: 2025-06-01
  End:   2025-06-01  ✗ (same date)
  
  Start: 2025-06-01
  End:   2025-05-31  ✗ (end before start)
```

**Check Dates**:
```
June 1, 2025  → 2025-06-01
May 31, 2026  → 2026-05-31

Difference must be > 0 days
```

---

### Issue 6: "Cannot delete the active school year" Error

**Symptoms**:
- Delete button doesn't work
- Error when trying to delete

**Cause**: School year is currently active

**Solutions**:

```
Step 1: Activate a different school year
  - Click "Manage School Years"
  - Click "Activate" on another year
  
Step 2: Try deleting again
  - Open "Manage School Years"
  - Click "Delete" on the year
```

---

### Issue 7: Changes Not Saving

**Symptoms**:
- Click save, page reloads, changes are gone
- No error message

**Causes**:
1. Database permission issue
2. Connection error
3. Transaction rollback

**Solutions**:

```sql
-- Check 1: Verify database user permissions
-- Login to MySQL as admin
SELECT USER(), DATABASE();

-- Check 2: Ensure user has UPDATE permission
GRANT UPDATE ON svhs_sms.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;

-- Check 3: Test direct update
UPDATE school_year SET status = 'Inactive' WHERE schoolYear = '2025-2026';
SELECT * FROM school_year;
```

**Debug PHP**:
```php
// Add to activateSY.php for debugging
try {
    // your code here
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    file_put_contents("debug.log", "Error: " . $e->getMessage() . "\n", FILE_APPEND);
}
```

---

### Issue 8: "School year already exists" Error

**Symptoms**:
- Cannot add school year that should be new

**Cause**: School year is already in database

**Solutions**:

```sql
-- Check if school year exists
SELECT * FROM school_year WHERE schoolYear = '2025-2026';

-- If exists, either:
-- 1. Use different year (e.g., 2026-2027)
-- 2. Delete the existing one first
-- 3. Update the existing one instead

-- Delete if needed:
DELETE FROM school_year WHERE schoolYear = '2025-2026';
```

---

### Issue 9: Image Upload Not Working

**Symptoms**:
- Upload button doesn't respond
- File not saved
- Error about upload

**Causes**:
1. File too large
2. Invalid file type
3. Directory permissions
4. Upload limit exceeded

**Solutions**:

```php
// Check file size limit
// Max allowed: 5MB
// If larger, compress image first

// Check file type
// Allowed: .jpg, .jpeg, .png, .gif, .webp
// If different, convert to one of these

// Check directory permissions
// admin/img/ folder must be writable
// Linux: chmod 755 admin/img/
// Windows: Right-click → Properties → Security → Full Control
```

**Test Upload**:
```php
// Add this to activateSY.php temporarily
if ($_FILES['file']['error'] != UPLOAD_ERR_OK) {
    $errors = array(
        UPLOAD_ERR_INI_SIZE => 'File larger than php.ini limit',
        UPLOAD_ERR_FORM_SIZE => 'File larger than form limit',
        UPLOAD_ERR_PARTIAL => 'File partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'No temp directory',
        UPLOAD_ERR_CANT_WRITE => 'Cannot write to disk',
        UPLOAD_ERR_EXTENSION => 'Extension not allowed'
    );
    echo $errors[$_FILES['file']['error']];
}
```

---

### Issue 10: Dropdown Shows but Values Don't Change

**Symptoms**:
- Dropdown works, but selection doesn't update
- Selection reverts after submit

**Cause**: Form submission issue

**Solutions**:

```javascript
// Check browser console (F12 → Console)
// Look for errors when clicking buttons

// Verify form is submitting
// Check network tab in DevTools
// Should see POST request to activateSY.php

// Check server response
// Should redirect to school_preferences.php
// Check if session messages are being set
```

---

## 🔍 Debugging Steps

### Step 1: Browser Console
```javascript
// Press F12 → Console tab
// Check for JavaScript errors (red text)
console.log('Page loaded successfully');
```

### Step 2: Network Tab
```
Press F12 → Network tab
Perform action
Look for failed requests (red)
Check response code (should be 200 or 302)
```

### Step 3: Database Query
```sql
-- Test the exact query
SELECT sy_id, schoolYear, status, fy_start_date, fy_end_date 
FROM school_year 
ORDER BY schoolYear DESC;

-- Should return rows if data exists
```

### Step 4: PHP Logs
```bash
# Check PHP error log
tail -f /var/log/php-errors.log

# Or create test file
<?php echo phpinfo(); ?>
```

---

## 📋 Quick Checklist

Before asking for help, verify:

- [ ] Database migration applied (`fy_start_date` column exists)
- [ ] Bootstrap CSS/JS loaded in page
- [ ] jQuery available (if needed)
- [ ] Admin user has database permissions
- [ ] `admin/img/` folder is writable
- [ ] No PHP errors in server logs
- [ ] School years exist in database
- [ ] JavaScript enabled in browser
- [ ] No browser extensions blocking popups/modals
- [ ] Session management working

---

## 🆘 Getting Help

### Gather Information
1. **Error Message** - Exact text
2. **Browser** - Name and version
3. **PHP Version** - From phpinfo()
4. **Database** - Type and version
5. **Steps to Reproduce** - Exact actions
6. **Browser Console** - Any errors
7. **Network Log** - Failed requests
8. **Server Logs** - PHP errors

### Support Resources
- Documentation: `docs/school-year-management.md`
- Setup Guide: `docs/SETUP-GUIDE.md`
- UI Guide: `docs/UI-UX-GUIDE.md`
- Database Schema: `db/svhs_sms-current-schema.sql`

### Report Issues With
```
Issue Title: [Clear, specific title]
Description: [What happened, what you expected]
Steps: [Exact steps to reproduce]
Browser: [Name and version]
Error: [Complete error message]
Screenshots: [If applicable]
Logs: [Server/console errors]
```

---

## 💡 Pro Tips

1. **Always backup database** before running migrations
2. **Test in staging** before production
3. **Clear browser cache** (Ctrl+Shift+Del) if issues persist
4. **Check browser console** first for errors
5. **Use prepared statements** in custom code
6. **Validate dates** carefully (YYYY-MM-DD format)
7. **Set proper permissions** on upload directories
8. **Monitor PHP error logs** regularly
9. **Test with multiple browsers** for compatibility
10. **Document custom changes** for future reference

---

**Last Updated**: January 20, 2026  
**Version**: 1.0  
**Status**: Complete
