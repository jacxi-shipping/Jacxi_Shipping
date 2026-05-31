import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { ModuleLanding } from '../../components/shared/ModuleLanding';

const FinanceScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <ModuleLanding
      eyebrow="FINANCE"
      title="Finance"
      subtitle="A mobile finance workspace that mirrors the web dashboard structure and branches into billing, banking, and ledger work."
      heroIcon="$$"
      heroTitle="Finance workspace"
      heroDescription="This replaces the old placeholder with a real finance entry surface for admins, matching the higher-level module organization used on the web app."
      actions={[
        {
          title: 'Invoices',
          description: 'Manage invoice status, payment follow-up, and billing workflow.',
          icon: 'IV',
          onPress: () => navigation.navigate('Invoices'),
        },
        {
          title: 'Banking',
          description: 'Open bank connectivity and finance operations related to account syncing.',
          icon: 'BK',
          onPress: () => navigation.navigate('Banking'),
        },
        {
          title: 'Company Ledgers',
          description: 'Access company-level balances and ledger-oriented finance workflow.',
          icon: 'CL',
          onPress: () => navigation.navigate('CompanyLedgers'),
        },
        {
          title: 'Reports',
          description: 'Review summary, user-wise, and shipment-wise financial reports.',
          icon: 'RP',
          onPress: () => navigation.navigate('FinanceReports'),
        },
      ]}
      footerDescription="This screen now branches into live finance submodules for banking, company ledgers, invoices, and reporting instead of ending at a shell."
    />
  );
};

export default FinanceScreen;
