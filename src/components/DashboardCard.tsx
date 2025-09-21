import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  details?: string;
  trend?: 'up' | 'down';
  link?: string;  // Added link prop
}

const DashboardCard = ({
  title,
  value,
  icon,
  color = 'bg-blue-50',
  details,
  trend,
  link
}: DashboardCardProps) => {
  const content = (
    <Card className="p-4 h-full">
      <CardContent className="p-0 space-y-2">
        <div className="flex justify-between items-center">
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trend === 'up' ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {details}
            </div>
          )}
        </div>
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {details && !trend && <p className="text-gray-500 text-xs">{details}</p>}
        </div>
      </CardContent>
    </Card>
  );
  
  // If link prop is provided, wrap content in a Link component
  if (link) {
    return (
      <Link to={link} className="block h-full">
        {content}
      </Link>
    );
  }
  
  // Otherwise return content directly
  return content;
};

export default DashboardCard;
export type { DashboardCardProps };
