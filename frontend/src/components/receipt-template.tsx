import { forwardRef } from 'react';

interface ReceiptItem {
  payment_id: number;
  category_id: number;
  particular_id: number;
  amt_payable: number;
  amt_paid: number;
  payment_type: string;
}

interface ReceiptTransaction {
  receipt_num: string;
  entry_date: string | null;
  trans_time: string | null;
  trans_payment_type: string;
  net_amt_payable: number;
  amt_tend: number;
  remarks: string | null;
  student?: {
    reg_id: number;
    lname: string;
    fname: string;
    mname: string;
    student_id: string;
    gradeLevel?: string;
    strand?: string;
    dept?: string;
    section?: string;
  } | null;
}

interface ReceiptSchool {
  schoolName: string;
  address: string;
  contactNumber: string | null;
  emailAddress: string | null;
  logo: string | null;
}

export interface ReceiptData {
  transaction: ReceiptTransaction;
  items: ReceiptItem[];
  school?: ReceiptSchool | null;
  categoryMap?: Record<number, string>;
  particularMap?: Record<number, string>;
}

interface ReceiptTemplateProps {
  data: ReceiptData;
  categoryMap?: Record<number, string>;
  particularMap?: Record<number, string>;
  variant?: 'standard' | 'nsf' | 'refund';
}

function formatPeso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function groupByCategory(items: ReceiptItem[]) {
  const groups: Record<number, ReceiptItem[]> = {};
  for (const item of items) {
    if (!groups[item.category_id]) groups[item.category_id] = [];
    groups[item.category_id].push(item);
  }
  return groups;
}

const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ data, categoryMap = {}, particularMap = {}, variant = 'standard' }, ref) => {
    const { transaction: txn, items, school } = data;
    const student = txn.student;
    const grouped = groupByCategory(items);
    const totalPaid = items.reduce((s, i) => s + Number(i.amt_paid), 0);
    const change = Number(txn.amt_tend) - totalPaid;
    const receiptLabel =
      variant === 'refund' ? 'REFUND RECEIPT' : variant === 'nsf' ? 'NON-STUDENT FEE RECEIPT' : 'ACKNOWLEDGEMENT RECEIPT';

    return (
      <div ref={ref} className="receipt-print max-w-[400px] mx-auto p-6 text-xs font-sans leading-relaxed print:p-4 print:max-w-full">
        {/* School Header */}
        <div className="text-center mb-4">
          {school?.logo && (
            <img
              src={`${(import.meta.env.VITE_API_URL || '/api').replace('/api', '')}/storage/${school.logo}`}
              alt="Logo"
              className="h-12 mx-auto mb-1"
            />
          )}
          <h2 className="text-sm font-bold uppercase">{school?.schoolName || 'School Name'}</h2>
          {school?.address && <p className="text-[10px]">{school.address}</p>}
          {school?.contactNumber && <p className="text-[10px]">{school.contactNumber}</p>}
        </div>

        <div className="border-t border-b border-black py-1 text-center font-bold text-xs mb-3">
          {receiptLabel}
        </div>

        {/* Receipt Info */}
        <div className="flex justify-between mb-2">
          <span>AR #: <strong className="font-mono">{txn.receipt_num}</strong></span>
          <span>{txn.entry_date || ''}</span>
        </div>

        {/* Student / Payee Info */}
        {student && (
          <div className="mb-3 space-y-0.5">
            <p>Name: <strong>{student.lname}, {student.fname} {student.mname}</strong></p>
            <p>Student ID: <strong className="font-mono">{student.student_id}</strong></p>
            {student.gradeLevel && (
              <p>
                {student.gradeLevel}
                {student.strand && student.strand !== '-' && student.strand !== 'N/A' ? ` — ${student.strand}` : ''}
                {student.section && student.section !== '-' ? ` / ${student.section}` : ''}
              </p>
            )}
          </div>
        )}

        {/* Payment Details */}
        <table className="w-full mb-3">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-0.5">Description</th>
              <th className="text-right py-0.5 w-20">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([catId, catItems]) => (
              <tr key={catId} className="align-top">
                <td colSpan={2} className="pt-1.5">
                  <p className="font-semibold text-[10px] uppercase">{categoryMap[Number(catId)] || `Category ${catId}`}</p>
                  <table className="w-full">
                    <tbody>
                      {catItems.filter(i => i.amt_paid > 0).map((item) => (
                        <tr key={item.payment_id}>
                          <td className="pl-2 py-0.5">{particularMap[item.particular_id] || `Item ${item.particular_id}`}</td>
                          <td className="text-right w-20 py-0.5 font-mono">{formatPeso(item.amt_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black font-bold">
              <td className="py-1">Total Paid</td>
              <td className="text-right py-1 font-mono">{formatPeso(totalPaid)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Tender & Change */}
        <div className="space-y-0.5 mb-3 text-[10px]">
          <div className="flex justify-between">
            <span>Amount Tendered:</span>
            <span className="font-mono">{formatPeso(txn.amt_tend)}</span>
          </div>
          {change > 0 && (
            <div className="flex justify-between">
              <span>Change:</span>
              <span className="font-mono">{formatPeso(change)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Payment Mode:</span>
            <span>{txn.trans_payment_type || 'Cash'}</span>
          </div>
          {txn.remarks && (
            <div className="flex justify-between">
              <span>Remarks:</span>
              <span>{txn.remarks}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dashed pt-2 text-center text-[9px] text-gray-500">
          <p>Thank you for your payment.</p>
          <p>This serves as your official receipt.</p>
        </div>
      </div>
    );
  },
);

ReceiptTemplate.displayName = 'ReceiptTemplate';

export default ReceiptTemplate;
