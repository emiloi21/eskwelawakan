@php $reportTitle = 'Promotion & Retention Report — ' . ($sy ?? ''); $filters = ['School Year' => $sy ?? 'All']; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>Summary</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ array_sum(array_column($data, 'promoted')) }}</strong>
      <span>Promoted</span>
    </div>
    <div class="summary-item">
      <strong>{{ array_sum(array_column($data, 'retained')) }}</strong>
      <span>Retained</span>
    </div>
    <div class="summary-item">
      <strong>{{ array_sum(array_column($data, 'total')) }}</strong>
      <span>Total Students</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Grade Level</th>
      <th>Total</th>
      <th>Promoted</th>
      <th>Promotion %</th>
      <th>Retained</th>
      <th>Retention %</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $row)
    <tr>
      <td>{{ $row['grade_level'] }}</td>
      <td>{{ $row['total'] }}</td>
      <td>{{ $row['promoted'] }}</td>
      <td>{{ $row['promotion_pct'] }}%</td>
      <td>{{ $row['retained'] }}</td>
      <td>
        <span class="badge {{ $row['retention_pct'] > 20 ? 'badge-red' : 'badge-green' }}">
          {{ $row['retention_pct'] }}%
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
