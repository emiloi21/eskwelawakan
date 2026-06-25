@php $reportTitle = 'Classroom Utilization Report — ' . ($sy ?? ''); $filters = ['School Year' => $sy ?? 'All']; @endphp
@include('dss.reports._header')

<table>
  <thead>
    <tr>
      <th>Room</th>
      <th>Location</th>
      <th>Capacity</th>
      <th>Sections Assigned</th>
      <th>Hours/Wk</th>
      <th>Utilization %</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $row)
    <tr>
      <td>{{ $row['room_name'] }}</td>
      <td>{{ $row['location'] ?? '—' }}</td>
      <td>{{ $row['capacity'] }}</td>
      <td>{{ $row['sections_assigned'] }}</td>
      <td>{{ $row['scheduled_hours_per_week'] }}</td>
      <td>{{ $row['utilization_pct'] }}%</td>
      <td>
        <span class="badge {{ match($row['status']) { 'optimal' => 'badge-green', 'underutilized' => 'badge-yellow', default => 'badge-red' } }}">
          {{ ucfirst($row['status']) }}
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
