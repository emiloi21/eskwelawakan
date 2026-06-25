<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Statement of Account</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: DejaVu Sans, Arial, sans-serif;
    font-size: 9pt;
    color: #1a1a1a;
    background: #fff;
  }

  /* ── Header ────────────────────────────────────────────────────── */
  .school-header {
    text-align: center;
    border-bottom: 2px solid #1a56db;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .school-name {
    font-size: 14pt;
    font-weight: bold;
    color: #1a56db;
  }
  .school-sub {
    font-size: 8pt;
    color: #555;
    margin-top: 2px;
  }
  .doc-title {
    font-size: 12pt;
    font-weight: bold;
    margin-top: 6px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* ── Student Info Box ───────────────────────────────────────────── */
  .info-box {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background: #f9fafb;
  }
  .info-grid {
    width: 100%;
    border-collapse: collapse;
  }
  .info-grid td {
    padding: 2px 6px;
    font-size: 8.5pt;
    vertical-align: top;
  }
  .info-label {
    color: #6b7280;
    width: 25%;
    font-weight: bold;
  }
  .info-value {
    width: 25%;
    font-weight: 600;
  }

  /* ── Summary Cards ──────────────────────────────────────────────── */
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
  }
  .summary-table td {
    text-align: center;
    padding: 6px 4px;
    border: 1px solid #e5e7eb;
    background: #eff6ff;
  }
  .summary-label {
    font-size: 7.5pt;
    color: #6b7280;
    display: block;
  }
  .summary-amount {
    font-size: 10pt;
    font-weight: bold;
    color: #1a1a1a;
  }
  .summary-balance .summary-amount {
    color: #dc2626;
  }

  /* ── Charges Table ──────────────────────────────────────────────── */
  .section-title {
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #374151;
    border-bottom: 1px solid #9ca3af;
    padding-bottom: 3px;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .charges-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 8.5pt;
  }
  .charges-table thead tr {
    background: #1a56db;
    color: #fff;
  }
  .charges-table thead th {
    padding: 5px 8px;
    text-align: left;
    font-size: 8pt;
  }
  .charges-table thead th.num {
    text-align: right;
  }
  .charges-table tbody tr:nth-child(even) {
    background: #f9fafb;
  }
  .charges-table tbody tr.category-row {
    background: #e0e7ff;
    font-weight: bold;
  }
  .charges-table tbody td {
    padding: 4px 8px;
    border-bottom: 1px solid #e5e7eb;
  }
  .charges-table tbody td.num {
    text-align: right;
  }
  .charges-table tbody tr.item-row td {
    padding-left: 20px;
    color: #374151;
  }
  .charges-table tfoot tr {
    background: #1e40af;
    color: #fff;
    font-weight: bold;
  }
  .charges-table tfoot td {
    padding: 5px 8px;
  }
  .charges-table tfoot td.num {
    text-align: right;
  }

  /* ── Transactions Table ─────────────────────────────────────────── */
  .txn-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 8.5pt;
  }
  .txn-table thead tr {
    background: #374151;
    color: #fff;
  }
  .txn-table thead th {
    padding: 5px 8px;
    text-align: left;
    font-size: 8pt;
  }
  .txn-table thead th.num {
    text-align: right;
  }
  .txn-table tbody tr:nth-child(even) { background: #f9fafb; }
  .txn-table tbody td {
    padding: 4px 8px;
    border-bottom: 1px solid #e5e7eb;
  }
  .txn-table tbody td.num {
    text-align: right;
  }
  .txn-table tfoot tr {
    background: #374151;
    color: #fff;
    font-weight: bold;
  }
  .txn-table tfoot td {
    padding: 5px 8px;
  }
  .txn-table tfoot td.num {
    text-align: right;
  }

  /* ── Footer ─────────────────────────────────────────────────────── */
  .signature-section {
    width: 100%;
    border-collapse: collapse;
    margin-top: 24px;
  }
  .signature-section td {
    width: 33%;
    text-align: center;
    padding: 4px 16px;
    vertical-align: bottom;
  }
  .sig-line {
    border-top: 1px solid #374151;
    padding-top: 4px;
    font-size: 8pt;
    font-weight: bold;
  }
  .sig-role {
    font-size: 7.5pt;
    color: #6b7280;
  }

  .page-footer {
    position: fixed;
    bottom: 10px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7.5pt;
    color: #9ca3af;
    border-top: 1px solid #e5e7eb;
    padding-top: 4px;
  }

  .balance-highlight {
    color: #dc2626;
    font-weight: bold;
  }
  .paid-full {
    color: #16a34a;
    font-weight: bold;
  }
</style>
</head>
<body>

<!-- Page footer on every page -->
<div class="page-footer">
  {{ $school->schoolName ?? 'School' }} &bull; Statement of Account &bull; Generated: {{ $generatedAt }} &bull; Page <span class="pagenum"></span>
</div>

<!-- ── School Header ──────────────────────────────────────────────────── -->
<div class="school-header">
  <div class="school-name">{{ $school->schoolName ?? 'Senior High School' }}</div>
  <div class="school-sub">
    {{ $school->address ?? '' }}
    @if($school->contactNumber) &bull; Tel: {{ $school->contactNumber }} @endif
    @if($school->emailAddress) &bull; {{ $school->emailAddress }} @endif
  </div>
  <div class="doc-title">Statement of Account</div>
</div>

<!-- ── Student Info ────────────────────────────────────────────────────── -->
<div class="info-box">
  <table class="info-grid">
    <tr>
      <td class="info-label">Student Name:</td>
      <td class="info-value" colspan="3">{{ $student['name'] }}</td>
    </tr>
    <tr>
      <td class="info-label">Student ID:</td>
      <td class="info-value">{{ $student['student_id'] }}</td>
      <td class="info-label">Grade / Level:</td>
      <td class="info-value">{{ $student['grade_level'] }}{{ $student['strand'] ? ' — ' . $student['strand'] : '' }}</td>
    </tr>
    <tr>
      <td class="info-label">Section:</td>
      <td class="info-value">{{ $student['section'] ?? '—' }}</td>
      <td class="info-label">School Year:</td>
      <td class="info-value">{{ $student['school_year'] }}</td>
    </tr>
    <tr>
      <td class="info-label">Date Printed:</td>
      <td class="info-value" colspan="3">{{ $generatedAt }}</td>
    </tr>
  </table>
</div>

<!-- ── Summary Cards ──────────────────────────────────────────────────── -->
<table class="summary-table">
  <tr>
    <td>
      <span class="summary-label">Total Assessed</span>
      <span class="summary-amount">{{ $peso($summary['total_assessed']) }}</span>
    </td>
    <td>
      <span class="summary-label">Total Discount</span>
      <span class="summary-amount">{{ $peso($summary['total_discount']) }}</span>
    </td>
    <td>
      <span class="summary-label">Total Paid</span>
      <span class="summary-amount" style="color:#16a34a">{{ $peso($summary['total_paid']) }}</span>
    </td>
    <td class="summary-balance">
      <span class="summary-label">Outstanding Balance</span>
      <span class="summary-amount {{ $summary['total_balance'] <= 0 ? 'paid-full' : 'balance-highlight' }}">
        {{ $summary['total_balance'] <= 0 ? 'PAID IN FULL' : $peso($summary['total_balance']) }}
      </span>
    </td>
  </tr>
</table>

<!-- ── Charges Breakdown ──────────────────────────────────────────────── -->
<div class="section-title">Charges Breakdown</div>
<table class="charges-table">
  <thead>
    <tr>
      <th style="width:40%">Description</th>
      <th class="num">Assessed</th>
      <th class="num">Discount</th>
      <th class="num">Paid</th>
      <th class="num">Balance</th>
    </tr>
  </thead>
  <tbody>
    @foreach($charges as $cat)
    <tr class="category-row">
      <td>{{ $cat['category'] }}</td>
      <td class="num">{{ $peso($cat['payable']) }}</td>
      <td class="num">{{ $peso($cat['discount']) }}</td>
      <td class="num">{{ $peso($cat['paid']) }}</td>
      <td class="num {{ $cat['balance'] > 0 ? 'balance-highlight' : '' }}">{{ $peso($cat['balance']) }}</td>
    </tr>
    @foreach($cat['items'] as $item)
    <tr class="item-row">
      <td>{{ $item['description'] }}</td>
      <td class="num">{{ $peso($item['payable']) }}</td>
      <td class="num">{{ $peso($item['discount']) }}</td>
      <td class="num">{{ $peso($item['paid']) }}</td>
      <td class="num {{ $item['balance'] > 0 ? 'balance-highlight' : '' }}">{{ $peso($item['balance']) }}</td>
    </tr>
    @endforeach
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td>TOTAL</td>
      <td class="num">{{ $peso($summary['total_assessed']) }}</td>
      <td class="num">{{ $peso($summary['total_discount']) }}</td>
      <td class="num">{{ $peso($summary['total_paid']) }}</td>
      <td class="num">{{ $peso($summary['total_balance']) }}</td>
    </tr>
  </tfoot>
</table>

<!-- ── Payment Transactions ───────────────────────────────────────────── -->
@if(count($transactions) > 0)
<div class="section-title">Payment History</div>
<table class="txn-table">
  <thead>
    <tr>
      <th>Receipt No.</th>
      <th>Date</th>
      <th>Type</th>
      <th class="num">Amount Paid</th>
      <th>Remarks</th>
    </tr>
  </thead>
  <tbody>
    @foreach($transactions as $txn)
    <tr>
      <td>{{ $txn['receipt_num'] }}</td>
      <td>{{ $txn['date'] }}</td>
      <td>{{ $txn['type'] }}</td>
      <td class="num">{{ $peso($txn['amount']) }}</td>
      <td>{{ $txn['remarks'] ?? '—' }}</td>
    </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td colspan="3">TOTAL PAYMENTS</td>
      <td class="num">{{ $peso(array_sum(array_column($transactions, 'amount'))) }}</td>
      <td></td>
    </tr>
  </tfoot>
</table>
@else
<div style="font-size:8.5pt; color:#6b7280; margin-bottom:14px; font-style:italic;">No payment transactions recorded yet.</div>
@endif

<!-- ── Signature Block ─────────────────────────────────────────────────── -->
<table class="signature-section">
  <tr>
    <td>
      <div style="height:28px"></div>
      <div class="sig-line">{{ $student['name'] }}</div>
      <div class="sig-role">Student / Parent Signature over Printed Name</div>
    </td>
    <td>
      <div style="height:28px"></div>
      <div class="sig-line">Cashier / Treasurer</div>
      <div class="sig-role">Authorized Signatory</div>
    </td>
    <td>
      <div style="height:28px"></div>
      <div class="sig-line">School Principal / Administrator</div>
      <div class="sig-role">Noted By</div>
    </td>
  </tr>
</table>

</body>
</html>
