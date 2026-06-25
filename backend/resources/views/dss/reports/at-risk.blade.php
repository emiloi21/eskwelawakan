@php $reportTitle = 'At-Risk Students Report — ' . ($sy ?? ''); $filters = ['School Year' => $sy ?? 'All']; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>At-Risk Students</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ count($data) }}</strong>
      <span>Total At-Risk</span>
    </div>
    <div class="summary-item">
      <strong>{{ count(array_filter($data, fn($s) => ($s['intervention_status'] ?? '') === 'resolved')) }}</strong>
      <span>Resolved</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Student Name</th>
      <th>Grade Level</th>
      <th>Section</th>
      <th>Flag Reasons</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $s)
    <tr>
      <td>{{ $s['student_name'] }}</td>
      <td>{{ $s['grade_level'] }}</td>
      <td>{{ $s['section'] }}</td>
      <td>{{ implode(', ', $s['flag_reasons']) }}</td>
      <td>
        <span class="badge {{ match($s['intervention_status']) { 'resolved' => 'badge-green', 'under_intervention' => 'badge-yellow', default => 'badge-red' } }}">
          {{ str_replace('_', ' ', $s['intervention_status']) }}
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
