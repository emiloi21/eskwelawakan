@php $reportTitle = 'Faculty Load Report — ' . ($sy ?? ''); $filters = ['School Year' => $sy ?? 'All']; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>Summary</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ count($data) }}</strong>
      <span>Faculty Members</span>
    </div>
    <div class="summary-item">
      <strong>{{ count(array_filter($data, fn($f) => $f['load_status'] === 'overloaded')) }}</strong>
      <span>Overloaded</span>
    </div>
    <div class="summary-item">
      <strong>{{ count(array_filter($data, fn($f) => $f['load_status'] === 'optimal')) }}</strong>
      <span>Optimal</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Faculty Name</th>
      <th>Department</th>
      <th>Subjects</th>
      <th>Units</th>
      <th>Load Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $row)
    <tr>
      <td>{{ $row['faculty_name'] }}</td>
      <td>{{ $row['department'] }}</td>
      <td>{{ $row['subject_count'] }}</td>
      <td>{{ $row['total_units'] }}</td>
      <td>
        <span class="badge {{ match($row['load_status']) { 'overloaded' => 'badge-red', 'optimal' => 'badge-green', default => 'badge-blue' } }}">
          {{ ucfirst($row['load_status']) }}
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
