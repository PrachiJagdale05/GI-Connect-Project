
import React, { ReactNode } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface CustomerLayoutProps {
  children: ReactNode;
  title: string;
}

const CustomerLayout = ({ children, title }: CustomerLayoutProps) => {
  return (
    <DashboardLayout title={title} role="customer">
      {children}
    </DashboardLayout>
  );
};

export default CustomerLayout;
