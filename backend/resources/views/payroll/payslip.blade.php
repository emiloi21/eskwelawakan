<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #222; }
  .payslip { width: 100%; padding: 18px; }
  .header  { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 10px; }
  .header h2 { font-size: 14px; font-weight: bold; }
  .header p  { font-size: 9px; color: #555; }
  .badge { display: inline-block; background: #333; color: #fff; font-size: 9px; padding: 2px 8px; border-radius: 3px; margin-top: 4px; }
  .employee-info { display: flex; justify-content: space-between; background: #f4f4f4; padding: 8px 10px; border-radius: 4px; margin-bottom: 10px; }
  .employee-info div { line-height: 1.6; }
  .label { font-weight: bold; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #333; color: #fff; padding: 4px 8px; text-align: left; font-size: 9px; }
  td { padding: 3px 8px; border-bottom: 1px solid #eee; }
  td.num { text-align: right; }
  .subtotal td { font-weight: bold; background: #eee; }
  .total-row td { font-weight: bold; font-size: 11px; background: #333; color: #fff; padding: 5px 8px; }
  .footer { margin-top: 14px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 8.5px; color: #666; text-align: center; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 24px; }
  .sig-box  { width: 44%; text-align: center; border-top: 1px solid #666; padding-top: 4px; font-size: 9px; }
</style>
</head>
<body>
<div class="payslip">

  {{-- Header --}}
  <div class="header">
    <h2>{{ $schoolPref->school_name ?? 'School' }}</h2>
    <p>{{ $schoolPref->school_address ?? '' }}</p>
    <div class="badge">PAYSLIP</div>
  </div>

  {{-- Employee info --}}
  <div class="employee-info">
    <div>
      <span class="label">Employee:</span> {{ $person->lname }}, {{ $person->fname }}{{ $person->mname ? ' '.$person->mname[0].'.' : '' }}<br>
      <span class="label">Employee ID:</span> {{ $person->employee_id }}<br>
      <span class="label">Department:</span> {{ $person->department?->name ?? '—' }}
    </div>
    <div>
      <span class="label">Position:</span> {{ $person->position?->name ?? '—' }}<br>
      <span class="label">Period:</span> {{ $period->period_label }}<br>
      <span class="label">Payout:</span> {{ $period->payout_date?->format('M d, Y') ?? '—' }}
    </div>
  </div>

  {{-- Earnings --}}
  <table>
    <thead><tr><th colspan="2">EARNINGS</th></tr></thead>
    <tbody>
      @if($item->basic_pay > 0)
      <tr><td>Basic Pay</td><td class="num">{{ number_format($item->basic_pay, 2) }}</td></tr>
      @endif
      @if($item->transportation_allowance > 0)
      <tr><td>Transportation Allowance</td><td class="num">{{ number_format($item->transportation_allowance, 2) }}</td></tr>
      @endif
      @if($item->rice_allowance > 0)
      <tr><td>Rice Allowance</td><td class="num">{{ number_format($item->rice_allowance, 2) }}</td></tr>
      @endif
      @if($item->clothing_allowance > 0)
      <tr><td>Clothing Allowance</td><td class="num">{{ number_format($item->clothing_allowance, 2) }}</td></tr>
      @endif
      @if($item->communication_allowance > 0)
      <tr><td>Communication Allowance</td><td class="num">{{ number_format($item->communication_allowance, 2) }}</td></tr>
      @endif
      @if($item->medical_allowance > 0)
      <tr><td>Medical Allowance</td><td class="num">{{ number_format($item->medical_allowance, 2) }}</td></tr>
      @endif
      @if($item->other_allowance > 0)
      <tr><td>{{ $item->other_allowance_label ?? 'Other Allowance' }}</td><td class="num">{{ number_format($item->other_allowance, 2) }}</td></tr>
      @endif
      @if($item->overtime_pay > 0)
      <tr><td>Overtime ({{ $item->overtime_hours }}h)</td><td class="num">{{ number_format($item->overtime_pay, 2) }}</td></tr>
      @endif
      @if($item->custom_earning > 0)
      <tr><td>{{ $item->custom_earning_label ?? 'Special Earning' }}</td><td class="num">{{ number_format($item->custom_earning, 2) }}</td></tr>
      @endif
      <tr class="subtotal"><td>Gross Pay</td><td class="num">{{ number_format($item->gross_pay, 2) }}</td></tr>
    </tbody>
  </table>

  {{-- Deductions --}}
  <table>
    <thead><tr><th colspan="2">DEDUCTIONS</th></tr></thead>
    <tbody>
      @if($item->sss_employee > 0)
      <tr><td>SSS Contribution</td><td class="num">{{ number_format($item->sss_employee, 2) }}</td></tr>
      @endif
      @if($item->philhealth_employee > 0)
      <tr><td>PhilHealth</td><td class="num">{{ number_format($item->philhealth_employee, 2) }}</td></tr>
      @endif
      @if($item->pagibig_employee > 0)
      <tr><td>Pag-IBIG</td><td class="num">{{ number_format($item->pagibig_employee, 2) }}</td></tr>
      @endif
      @if($item->withholding_tax > 0)
      <tr><td>Withholding Tax</td><td class="num">{{ number_format($item->withholding_tax, 2) }}</td></tr>
      @endif
      @if($item->sss_loan > 0)
      <tr><td>SSS Loan</td><td class="num">{{ number_format($item->sss_loan, 2) }}</td></tr>
      @endif
      @if($item->pagibig_loan > 0)
      <tr><td>Pag-IBIG Loan</td><td class="num">{{ number_format($item->pagibig_loan, 2) }}</td></tr>
      @endif
      @if($item->salary_advance > 0)
      <tr><td>Salary Advance</td><td class="num">{{ number_format($item->salary_advance, 2) }}</td></tr>
      @endif
      @if($item->absent_deduction > 0)
      <tr><td>Absent/Late Deduction</td><td class="num">{{ number_format($item->absent_deduction, 2) }}</td></tr>
      @endif
      @if($item->other_deductions > 0)
      <tr><td>{{ $item->other_deductions_label ?? 'Other Deductions' }}</td><td class="num">{{ number_format($item->other_deductions, 2) }}</td></tr>
      @endif
      <tr class="subtotal"><td>Total Deductions</td><td class="num">{{ number_format($item->total_employee_deductions, 2) }}</td></tr>
    </tbody>
  </table>

  {{-- Net Pay --}}
  <table>
    <tbody>
      <tr class="total-row">
        <td>NET PAY</td>
        <td class="num">PHP {{ number_format($item->net_pay, 2) }}</td>
      </tr>
    </tbody>
  </table>

  {{-- Remarks --}}
  @if($item->remarks)
  <p style="font-size:9px;color:#555;margin-bottom:8px;">Remarks: {{ $item->remarks }}</p>
  @endif

  {{-- Signatures --}}
  <div class="sig-row">
    <div class="sig-box">HR Officer / Prepared by</div>
    <div class="sig-box">Received by (Employee signature)</div>
  </div>

  <div class="footer">
    This payslip is system-generated. Please keep for your records.
    Period: {{ $period->period_start->format('M d') }} – {{ $period->period_end->format('M d, Y') }}
  </div>

</div>
</body>
</html>
