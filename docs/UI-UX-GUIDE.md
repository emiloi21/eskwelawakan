# UI/UX Visual Guide - School Year & Semester Management

## 🎨 Interface Layout

### Main School Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│ SCHOOL SETTINGS                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Alert Box - If applicable]                              │
│  ✓ School year activated successfully                      │
│  [×]                                                       │
│                                                             │
│  School Logo Section                                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ [Current Logo] [File Input] [New Logo Preview]       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  School Information (Read-only or Editable)               │
│  ├─ School ID: [______________]                          │
│  ├─ School Name: [______________]                        │
│  ├─ Address: [______________]                            │
│  └─ Other Info:                                          │
│     ├─ Email: [______________]                           │
│     └─ Contact: [______________]                         │
│                                                             │
│  [Cancel] [Update Information] (if in edit mode)         │
│                                                             │
├─ Active School Year Section ─────────────────────────────┤
│                                                             │
│  Select School Year:                                      │
│  [Dropdown: 2025-2026 (Active)] [Manage School Years]   │
│                                                             │
├─ Active Semester Section ─────────────────────────────────┤
│                                                             │
│  Select Semester:                                         │
│  [Dropdown: 1st Semester] [Activate Semester]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Manage School Years Modal

```
╔═════════════════════════════════════════════════════════════╗
║ 📅 School Year Management                             [×]   ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  ┌─ Add New School Year ─────────────────────────────────┐ ║
║  │                                                       │ ║
║  │ School Year: [2025-2026]     (Format: YYYY-YYYY)    │ ║
║  │ FY Start Date: [2025-06-01]                          │ ║
║  │ FY End Date: [2026-05-31]                            │ ║
║  │                                                       │ ║
║  │ [💾 Add School Year]                                │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                             ║
║  ┌─ All School Years ────────────────────────────────────┐ ║
║  │                                                       │ ║
║  │ School Year │ Status        │ Fiscal Year           │ ║
║  │             │               │                       │ ║
║  │ 2025-2026   │ 🟢 Active     │ Jun 01, 2025 - May31 │ ║
║  │             │               │ [Activate] [Edit]    │ ║
║  │─────────────┼───────────────┼─────────────────────────│ ║
║  │ 2024-2025   │ ⚫ Inactive    │ Jun 01, 2024 - May31 │ ║
║  │             │               │ [Activate] [Edit][❌] │ ║
║  │─────────────┼───────────────┼─────────────────────────│ ║
║  │ 2023-2024   │ ⚫ Inactive    │ Not set              │ ║
║  │             │               │ [Activate] [Edit][❌] │ ║
║  │                                                       │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                             ║
╠═════════════════════════════════════════════════════════════╣
║ [Close]                                                     ║
╚═════════════════════════════════════════════════════════════╝
```

## ✏️ Edit Fiscal Year Dates Modal

```
╔═════════════════════════════════════════════════════════════╗
║ 📅 Edit Fiscal Year Dates                            [×]   ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║ School Year: 2025-2026                                    ║
║                                                             ║
║ Fiscal Year Start Date: [📅 2025-06-01]                   ║
║ When the fiscal year begins                               ║
║                                                             ║
║ Fiscal Year End Date: [📅 2026-05-31]                     ║
║ When the fiscal year ends                                 ║
║                                                             ║
║                                                             ║
╠═════════════════════════════════════════════════════════════╣
║ [Cancel] [💾 Save Changes]                                 ║
╚═════════════════════════════════════════════════════════════╝
```

## 🎓 Activate Semester Modal

```
╔═════════════════════════════════════════════════════════════╗
║ ✓ Activate Semester                                 [×]   ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║ ℹ️ Current Settings:                                       ║
║    • Active School Year: 2025-2026                        ║
║    • Current Semester: 1st Semester                       ║
║                                                             ║
║ ⚠️ New Semester:                                           ║
║    • 2nd Semester (November - March)                      ║
║                                                             ║
║ 💡 This will update the system to use the selected        ║
║    semester for all new transactions.                     ║
║                                                             ║
╠═════════════════════════════════════════════════════════════╣
║ [Cancel] [✓ Confirm Activation]                            ║
╚═════════════════════════════════════════════════════════════╝
```

## 🎨 Color Scheme & Badges

### Status Badges
```
🟢 Active   - Green badge (#28a745)
⚫ Inactive - Gray badge (#6c757d)
```

### Modal Headers
```
📅 School Year Management     - Blue (#007bff)
✏️ Edit Fiscal Year Dates     - Info Blue (#17a2b8)
✓ Activate Semester            - Success Green (#28a745)
```

### Alert Messages
```
✓ Success - Green background (#d4edda)
  "School year activated successfully"

✗ Error - Red background (#f8d7da)
  "Cannot delete the active school year"

ℹ️ Info - Blue background (#d1ecf1)
  "Current Settings:"
```

## 📱 Responsive Behavior

### Desktop (>992px)
- All elements side-by-side
- Full modal width
- Multi-column tables

### Tablet (768px-992px)
- Some elements stack
- Modals adapt to width
- Scrollable tables

### Mobile (<768px)
- Full-width inputs
- Stacked buttons
- Horizontal scroll for tables
- Touch-friendly modal sizes

## ⌨️ Keyboard Navigation

```
Tab           - Move between fields
Enter         - Submit form / Activate button
Escape        - Close modal
Shift+Tab     - Move backward
Space         - Activate button/checkbox
```

## 🎯 Interactive States

### Buttons
```
Normal:   [Button text] (default color)
Hover:   [Button text] (darker shade)
Active:  [Button text] (pressed effect)
Disabled: [Button text] (grayed out, no click)
```

### Form Fields
```
Empty:    [___________]
Filled:   [2025-06-01]
Focus:    [__________] (blue border)
Error:    [__________] (red border + error msg)
Disabled: [__________] (grayed out)
```

## 📊 Data Display

### School Years Table
- Row colors change for active year (light green)
- Consistent column widths
- Icons for actions (pen=edit, trash=delete, check=activate)
- Hover effect on rows

### Information Display
```
School Year        │ 2025-2026
Status             │ 🟢 Active
Fiscal Year Start  │ Jun 01, 2025
Fiscal Year End    │ May 31, 2026
Duration           │ 365 days
```

## 🔔 User Feedback

### Success Scenario
1. User clicks "Add School Year"
2. Form validates
3. Submit button shows loading state
4. Redirect to page
5. Green alert appears: "✓ School year added successfully"

### Error Scenario
1. User enters invalid format
2. Form validation shows error message
3. Submit button remains enabled
4. User corrects and retries

### Confirmation Scenario
1. User clicks "Activate"
2. JavaScript shows browser confirm dialog
3. If confirmed, form submits
4. Page reloads with success message

## 🎨 Visual Hierarchy

```
Most Important: Active School Year (featured, green)
Important:      Fiscal Year Dates (required fields)
Secondary:      Inactive Years (grayed)
Least:          Buttons (supplementary actions)
```

## ✨ Special Effects

- **Badges**: Colored backgrounds with white text
- **Modals**: Semi-transparent backdrop, smooth fade-in
- **Buttons**: Shadow on hover, scale effect
- **Alerts**: Smooth fade-out on dismiss
- **Tables**: Subtle row hover effect

---

## 📸 Screenshot Reference Points

1. **Main Page**
   - School settings form visible
   - School year dropdown with "Manage" button
   - Semester selector with "Activate" button

2. **Management Modal**
   - Add form at top
   - School years table below
   - Color-coded statuses
   - Action buttons on each row

3. **Edit Modal**
   - Single school year display
   - Two date pickers
   - Save/Cancel buttons

4. **Confirm Modal**
   - Current semester display
   - New selection display
   - Clear confirmation text

---

**Design System**: Bootstrap 4  
**Icons**: Font Awesome 5  
**JavaScript Framework**: Vanilla JS (no jQuery required)  
**Accessibility**: WCAG 2.1 AA Compatible
