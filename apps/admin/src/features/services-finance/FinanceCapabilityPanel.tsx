import { Link } from 'react-router-dom';
import { OwnerPanel, useOwnerCopy } from './WorkspaceUI';

export function FinanceCapabilityPanel({ cash = false }: { cash?: boolean }) {
  const { c } = useOwnerCopy();
  return (
    <OwnerPanel
      title={
        cash
          ? c('الصناديق والحسابات البنكية', 'Cash drawers & bank accounts')
          : c('سندات القبض والمصروفات وفواتير الموردين', 'Receipts, expenses & supplier bills')
      }
    >
      <p className="sf-notice">
        {cash
          ? c(
              'إدارة حسابات النقد والبنوك الفعلية لم تُفعّل بعد. حسابات الأصول في دليل الحسابات لا تثبت وجود حساب بنكي أو رصيد متاح للصرف.',
              'Physical cash and bank account management is not enabled. Asset ledger accounts do not establish a bank account or spendable bank balance.',
            )
          : c(
              'تسجيل القبض اليدوي والمصروفات وفواتير الموردين لم يُفعّل بعد. يمكنك مراجعة القيود الموجودة، ولا تُنشأ سندات مالية من هذه الصفحة.',
              'Manual receipts, expenses and supplier bills are not enabled. Existing ledger entries remain available; this page does not create financial documents.',
            )}
      </p>
      <details>
        <summary>{c('متطلبات التفعيل', 'Activation requirements')}</summary>
        <ul className="list-disc ps-5 space-y-1">
          <li>
            {c(
              'اعتماد الكيان والعملة الأساسية ودليل الحسابات والفترات المالية.',
              'Approve the accounting entity, base currency, chart of accounts and financial periods.',
            )}
          </li>
          <li>
            {c(
              'اعتماد سياسة المستندات والإثبات والمراجعة والترحيل والتصحيح.',
              'Approve document, evidence, review, posting and correction policies.',
            )}
          </li>
          <li>
            {c(
              'استكمال حفظ السندات وربطها بالحسابات والموافقات، والتحقق على قاعدة معزولة قبل التشغيل.',
              'Complete document persistence, account and approval links; verify on an isolated database before activation.',
            )}
          </li>
        </ul>
      </details>
      <div className="sf-actions">
        <Link className="sf-link" to="/finance?tab=accounts">
          {c('فتح دليل الحسابات', 'Open chart of accounts')}
        </Link>
        <Link className="sf-link" to="/finance?tab=transactions">
          {c('سجل الحركات المرحّلة', 'Posted transactions')}
        </Link>
        <Link className="sf-link" to="/finance?tab=invoices">
          {c('فواتير الطلاب والخدمات', 'Student & service invoices')}
        </Link>
      </div>
    </OwnerPanel>
  );
}
