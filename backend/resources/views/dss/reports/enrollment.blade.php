@php $reportTitle = 'Enrollment Report — ' . ($sy ?? 'All Years'); $filters = ['School Year' => $sy ?? 'All']; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>Enrollment Summary</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ array_sum(array_column($data, 'enrolled_count')) }}</strong>
      <span>Total Enrolled</span>
    </div>
    <div class="summary-item">
      <strong>{{ count($data) }}</strong>
      <span>Grade Levels</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Grade Level</th>
      <th>Dept</th>
      <th>Enrolled</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $row)
    <tr>
      <td>{{ $row['grade_level'] }}</td>
      <td>{{ $row['dept'] }}</td>
      <td>{{ $row['enrolled_count'] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

<h3 style="margin-top:16px;font-size:10px;color:#1e3a8a;">Enrollment Trend (Last 5 School Years)</h3>
<table>
  <thead>
    <tr><th>School Year</th><th>Total Enrolled</th></tr>
  </thead>
  <tbody>
    @foreach($trend as $t)
    <tr>
      <td>{{ $t['school_year'] }}</td>
      <td>{{ $t['total_enrolled'] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
