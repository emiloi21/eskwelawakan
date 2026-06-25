<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Form 138 — Report Card</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: DejaVu Sans, Arial, sans-serif;
    font-size: 8.5pt;
    color: #111;
    background: #fff;
  }

  /* ── Header ────────────────────────────────────────────────────── */
  .school-header {
    text-align: center;
    border-bottom: 2px solid #166534;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .depedline {
    font-size: 7pt;
    color: #555;
    letter-spacing: 0.5px;
  }
  .school-name {
    font-size: 13pt;
    font-weight: bold;
    color: #166534;
    margin-top: 2px;
  }
  .school-sub {
    font-size: 7.5pt;
    color: #555;
    margin-top: 2px;
  }
  .form-title {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-top: 5px;
    color: #111;
  }
  .form-subtitle {
    font-size: 7.5pt;
    color: #555;
    margin-top: 1px;
  }

  /* ── Info Grid ──────────────────────────────────────────────────── */
  .info-outer {
    border: 1px solid #d1fae5;
    background: #f0fdf4;
    border-radius: 3px;
    padding: 7px 10px;
    margin-bottom: 10px;
  }
  .info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
  }
  .info-table td {
    padding: 2px 5px 2px 0;
    vertical-align: top;
  }
  .il { color: #374151; width: 22%; font-weight: bold; }
  .iv { width: 28%; font-weight: 600; border-bottom: 0.5px solid #9ca3af; }

  /* ── Grades Table ───────────────────────────────────────────────── */
  .section-label {
    font-size: 8pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #166534;
    border-bottom: 1px solid #166534;
    padding-bottom: 2px;
    margin: 10px 0 5px;
  }

  .grades-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    margin-bottom: 2px;
  }
  .grades-table thead tr {
    background: #166534;
    color: #fff;
  }
  .grades-table thead th {
    padding: 4px 6px;
    text-align: center;
    font-size: 7.5pt;
  }
  .grades-table thead th.left { text-align: left; }
  .grades-table tbody tr:nth-child(even) { background: #f0fdf4; }
  .grades-table tbody td {
    padding: 3px 6px;
    border-bottom: 0.5px solid #d1fae5;
    text-align: center;
  }
  .grades-table tbody td.left { text-align: left; }
  .grades-table tfoot tr { background: #dcfce7; font-weight: bold; }
  .grades-table tfoot td {
    padding: 4px 6px;
    text-align: center;
    font-size: 8pt;
    border-top: 1px solid #166534;
  }
  .grades-table tfoot td.left { text-align: left; }

  .grade-pass { color: #15803d; font-weight: 600; }
  .grade-fail { color: #dc2626; font-weight: 600; }
  .grade-ip   { color: #92400e; }

  /* ── Overall Average ────────────────────────────────────────────── */
  .gwa-box {
    border: 1px solid #166534;
    border-radius: 3px;
    display: inline-block;
    padding: 5px 14px;
    margin: 8px 0;
    background: #f0fdf4;
    text-align: center;
  }
  .gwa-label { font-size: 7.5pt; color: #555; }
  .gwa-value { font-size: 14pt; font-weight: bold; color: #166534; }
  .gwa-remarks { font-size: 8pt; font-weight: bold; }

  /* ── Signature Block ────────────────────────────────────────────── */
  .sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 8pt;
  }
  .sig-table td {
    text-align: center;
    padding: 2px 12px;
    vertical-align: bottom;
    width: 33%;
  }
  .sig-line {
    border-top: 1px solid #374151;
    padding-top: 3px;
    font-weight: bold;
  }
  .sig-role { font-size: 7pt; color: #6b7280; }

  /* ── Footer ─────────────────────────────────────────────────────── */
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
  {{ $school->schoolName ?? '' }} &bull; Form 138 — School Report Card &bull; {{ $generatedAt }}
</div>

<!-- ── Header ─────────────────────────────────────────────────────────── -->
<div class="school-header">
  <div class="depedline">Republic of the Philippines &bull; Department of Education</div>
  @if($school->region || $school->division)
    <div class="depedline">{{ $school->region }} &bull; {{ $school->division }}</div>
  @endif
  <div class="school-name">{{ $school->schoolName ?? 'Senior High School' }}</div>
  @if($school->address)
    <div class="school-sub">{{ $school->address }}</div>
  @endif
  <div class="form-title">School Report Card (Form 138)</div>
  <div class="form-subtitle">School Year {{ $student['school_year'] }}</div>
</div>

<!-- ── Student Info ───────────────────────────────────────────────────── -->
<div class="info-outer">
  <table class="info-table">
    <tr>
      <td class="il">Student Name:</td>
      <td class="iv" colspan="3"><strong>{{ $student['name'] }}</strong></td>
    </tr>
    <tr>
      <td class="il">Student ID:</td>
      <td class="iv">{{ $student['student_id'] }}</td>
      <td class="il">LRN:</td>
      <td class="iv">{{ $student['lrn'] ?? '—' }}</td>
    </tr>
    <tr>
      <td class="il">Grade Level:</td>
      <td class="iv">{{ $student['grade_level'] }}{{ $student['strand'] ? ' — ' . $student['strand'] : '' }}</td>
      <td class="il">Section:</td>
      <td class="iv">{{ $student['section'] ?? '—' }}</td>
    </tr>
    <tr>
      <td class="il">Class Adviser:</td>
      <td class="iv">{{ $student['adviser'] ?? '—' }}</td>
      <td class="il">School Year:</td>
      <td class="iv">{{ $student['school_year'] }}</td>
    </tr>
  </table>
</div>

<!-- ── Grades by Semester ─────────────────────────────────────────────── -->
@foreach($semesters as $semLabel => $sem)
<div class="section-label">Semester {{ $semLabel }}</div>
<table class="grades-table">
  <thead>
    <tr>
      <th class="left" style="width:38%">Learning Area / Subject</th>
      <th>Q1</th>
      <th>Q2</th>
      <th>Q3</th>
      <th>Q4</th>
      <th>Final Grade</th>
      <th>Remarks</th>
    </tr>
  </thead>
  <tbody>
    @foreach($sem['subjects'] as $subj)
    @php
      $fg = $subj['final_grade'];
      $cls = $fg === null ? 'grade-ip' : ($fg >= 75 ? 'grade-pass' : 'grade-fail');
      $fmt = fn($v) => $v !== null ? number_format((float)$v, 0) : '—';
    @endphp
    <tr>
      <td class="left">{{ $subj['subject'] }}</td>
      <td>{{ $fmt($subj['q1']) }}</td>
      <td>{{ $fmt($subj['q2']) }}</td>
      <td>{{ $fmt($subj['q3']) }}</td>
      <td>{{ $fmt($subj['q4']) }}</td>
      <td class="{{ $cls }}">{{ $fg !== null ? number_format((float)$fg, 2) : '—' }}</td>
      <td class="{{ $cls }}">{{ $subj['remarks'] ?? ($fg !== null ? ($fg >= 75 ? 'Passed' : 'Failed') : 'In Progress') }}</td>
    </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td class="left" colspan="5">General Average — Semester {{ $semLabel }}</td>
      @php
        $ga = $sem['general_average'];
        $gaCls = $ga === null ? 'grade-ip' : ($ga >= 75 ? 'grade-pass' : 'grade-fail');
      @endphp
      <td class="{{ $gaCls }}">{{ $ga !== null ? number_format((float)$ga, 2) : '—' }}</td>
      <td class="{{ $gaCls }}">{{ $ga !== null ? ($ga >= 75 ? 'Passed' : 'Failed') : 'In Progress' }}</td>
    </tr>
  </tfoot>
</table>
@endforeach

<!-- ── Overall / GWA ─────────────────────────────────────────────────── -->
<table style="width:100%; margin-top:8px;">
  <tr>
    <td>
      <div class="gwa-box">
        <div class="gwa-label">General Weighted Average</div>
        @php $oa = $overallAverage; @endphp
        <div class="gwa-value">{{ $oa !== null ? number_format((float)$oa, 2) : '—' }}</div>
        <div class="gwa-remarks {{ $oa !== null ? ($oa >= 75 ? 'grade-pass' : 'grade-fail') : 'grade-ip' }}">
          {{ $oa !== null ? ($oa >= 75 ? '✓ PASSED' : '✗ FAILED') : 'In Progress' }}
        </div>
      </div>
    </td>
    <td style="text-align:right; font-size:7.5pt; color:#555; vertical-align:top; padding-top:4px;">
      Date Issued: {{ $generatedAt }}<br>
      @if($school->schoolName)
        {{ $school->schoolName }}<br>
      @endif
      @if($school->address)
        {{ $school->address }}
      @endif
    </td>
  </tr>
</table>

<!-- ── Signature Block ────────────────────────────────────────────────── -->
<table class="sig-table">
  <tr>
    <td>
      <div style="height:24px"></div>
      <div class="sig-line">{{ $student['adviser'] ?? 'Class Adviser' }}</div>
      <div class="sig-role">Class Adviser</div>
    </td>
    <td>
      <div style="height:24px"></div>
      <div class="sig-line">Registrar</div>
      <div class="sig-role">School Registrar</div>
    </td>
    <td>
      <div style="height:24px"></div>
      <div class="sig-line">School Principal / Administrator</div>
      <div class="sig-role">Noted By</div>
    </td>
  </tr>
</table>

</body>
</html>
