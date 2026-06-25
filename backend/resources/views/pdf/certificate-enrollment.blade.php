<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Certificate of Enrollment</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: DejaVu Sans, Arial, sans-serif;
    font-size: 10pt;
    color: #111;
    background: #fff;
  }

  .outer {
    border: 3px double #1e40af;
    margin: 16px;
    padding: 28px 36px;
  }

  /* ── Header ──────────────────────────────────────────────────── */
  .school-header {
    text-align: center;
    border-bottom: 1.5px solid #1e40af;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .depedline {
    font-size: 8pt;
    color: #555;
    letter-spacing: 0.3px;
  }
  .school-name {
    font-size: 14pt;
    font-weight: bold;
    color: #1e40af;
    margin: 4px 0 2px;
  }
  .school-sub {
    font-size: 8pt;
    color: #555;
  }
  .cert-type {
    margin-top: 18px;
    font-size: 16pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #1e40af;
    text-align: center;
  }
  .cert-underline {
    height: 2px;
    background: #1e40af;
    width: 260px;
    margin: 4px auto 0;
  }

  /* ── Body text ───────────────────────────────────────────────── */
  .cert-body {
    margin: 24px 0 20px;
    line-height: 2;
    text-align: justify;
    font-size: 10.5pt;
  }
  .cert-body .to-whom {
    text-align: center;
    font-size: 9pt;
    color: #555;
    margin-bottom: 16px;
    font-style: italic;
  }
  .cert-body .student-name {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    color: #111;
  }
  .cert-body .highlight {
    font-weight: bold;
  }

  /* ── Detail Box ──────────────────────────────────────────────── */
  .detail-box {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    border-radius: 4px;
    padding: 10px 16px;
    margin: 14px 0;
    font-size: 9.5pt;
  }
  .detail-table {
    width: 100%;
    border-collapse: collapse;
  }
  .detail-table td {
    padding: 3px 8px 3px 0;
    vertical-align: top;
  }
  .dl { color: #374151; width: 35%; font-weight: bold; }
  .dv { font-weight: 600; }

  /* ── Purpose ─────────────────────────────────────────────────── */
  .purpose-line {
    margin-top: 14px;
    font-size: 9.5pt;
  }

  /* ── Signature ───────────────────────────────────────────────── */
  .sig-section {
    margin-top: 36px;
    display: table;
    width: 100%;
  }
  .sig-left {
    display: table-cell;
    width: 50%;
    vertical-align: bottom;
    font-size: 8.5pt;
    color: #555;
  }
  .sig-right {
    display: table-cell;
    width: 50%;
    text-align: center;
    vertical-align: bottom;
  }
  .sig-blank { height: 36px; }
  .sig-line {
    border-top: 1px solid #374151;
    padding-top: 3px;
    font-weight: bold;
    font-size: 9.5pt;
    display: inline-block;
    min-width: 220px;
    text-align: center;
  }
  .sig-role {
    font-size: 8pt;
    color: #6b7280;
    text-align: center;
  }

  /* ── Control Number ──────────────────────────────────────────── */
  .control-no {
    margin-top: 18px;
    font-size: 7.5pt;
    color: #9ca3af;
    text-align: right;
  }

  /* ── Footer ──────────────────────────────────────────────────── */
  .page-footer {
    position: fixed;
    bottom: 8px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7pt;
    color: #9ca3af;
    border-top: 1px solid #e5e7eb;
    padding-top: 3px;
  }
</style>
</head>
<body>

<div class="page-footer">
  {{ $school->schoolName ?? '' }} &bull; Certificate of Enrollment &bull; {{ $generatedAt }}
</div>

<div class="outer">

  <!-- ── School Header ────────────────────────────────────────────── -->
  <div class="school-header">
    <div class="depedline">Republic of the Philippines &bull; Department of Education</div>
    @if($school->region || $school->division)
      <div class="depedline">{{ $school->region }} &bull; {{ $school->division }}</div>
    @endif
    <div class="school-name">{{ $school->schoolName ?? 'Senior High School' }}</div>
    @if($school->address)
      <div class="school-sub">{{ $school->address }}</div>
    @endif
    <div class="cert-type">Certificate of Enrollment</div>
    <div class="cert-underline"></div>
  </div>

  <!-- ── Body ─────────────────────────────────────────────────────── -->
  <div class="cert-body">
    <p class="to-whom">TO WHOM IT MAY CONCERN:</p>

    <p>
      This is to certify that
      <span class="student-name">{{ $student['name'] }}</span>,
      with Student ID No. <span class="highlight">{{ $student['student_id'] }}</span>
      @if($student['lrn'])
        and LRN <span class="highlight">{{ $student['lrn'] }}</span>
      @endif
      , is a <span class="highlight">bona fide</span> student of this institution and is officially enrolled for School Year
      <span class="highlight">{{ $student['school_year'] }}</span>.
    </p>
  </div>

  <!-- ── Student Details Box ──────────────────────────────────────── -->
  <div class="detail-box">
    <table class="detail-table">
      <tr>
        <td class="dl">Grade Level:</td>
        <td class="dv">{{ $student['grade_level'] }}{{ $student['strand'] ? ' — ' . $student['strand'] : '' }}</td>
        <td class="dl">Section:</td>
        <td class="dv">{{ $student['section'] ?? '—' }}</td>
      </tr>
      <tr>
        <td class="dl">Department:</td>
        <td class="dv">{{ $student['dept'] ?? 'Senior High School' }}</td>
        <td class="dl">School Year:</td>
        <td class="dv">{{ $student['school_year'] }}</td>
      </tr>
      <tr>
        <td class="dl">Enrollment Status:</td>
        <td class="dv" colspan="3">{{ $student['status'] ?? 'Enrolled' }}</td>
      </tr>
    </table>
  </div>

  <!-- ── Purpose ──────────────────────────────────────────────────── -->
  <p class="purpose-line">
    This certification is issued upon the request of the above-named student
    @if($purpose)
      for the purpose of <span style="font-weight:bold; text-decoration:underline;">{{ $purpose }}</span>
    @endif
    and is valid only for the purpose stated herein.
  </p>

  <!-- ── Issued ────────────────────────────────────────────────────── -->
  <p style="margin-top: 16px; font-size: 9.5pt;">
    Issued this <span style="font-weight:bold;">{{ now()->format('jS') }}</span> day of
    <span style="font-weight:bold;">{{ now()->format('F Y') }}</span>
    at {{ $school->address ?? 'the school premises' }}.
  </p>

  <!-- ── Signature ─────────────────────────────────────────────────── -->
  <table style="width:100%; margin-top:36px;">
    <tr>
      <td style="width:50%; vertical-align:bottom; font-size:8pt; color:#555;">
        Date Issued: <strong>{{ $generatedAt }}</strong><br>
        Control No.: <span style="font-family: monospace;">{{ $controlNo }}</span>
      </td>
      <td style="width:50%; text-align:center; vertical-align:bottom;">
        <div style="height:36px;"></div>
        <div class="sig-line">School Registrar / Principal</div>
        <div class="sig-role">Authorized Signatory</div>
        <div class="sig-role" style="margin-top:2px;">{{ $school->schoolName ?? '' }}</div>
      </td>
    </tr>
  </table>

  <div class="control-no">
    Document Reference: {{ $controlNo }}&nbsp;&nbsp;|&nbsp;&nbsp;Generated: {{ $generatedAt }}
  </div>

</div><!-- /.outer -->
</body>
</html>
