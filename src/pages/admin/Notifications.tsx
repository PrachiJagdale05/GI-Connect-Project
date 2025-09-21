
import { useState, useEffect } from 'react';
import { Bell, UserCog, Package, Shield, ShoppingBag, Users, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  priority: string;
  action_url?: string;
  entity_id?: string;
  user_id?: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'vendor_update' | 'product_update' | 'gi_verification'>('all');

  // Fetch notifications from the database
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_notifications');
      
      if (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to direct query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          generateMockNotifications();
          return;
        }
        setNotifications(fallbackData || []);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      generateMockNotifications();
    } finally {
      setLoading(false);
    }
  };

  // Generate mock notifications if database access fails
  const generateMockNotifications = () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'vendor_update',
        title: 'New Vendor Registration',
        message: 'New vendor registered: Artisan Crafts Delhi',
        created_at: new Date().toISOString(),
        read: false,
        priority: 'medium',
        action_url: '/admin-dashboard/vendors',
        entity_id: 'vendor_1',
        user_id: null
      },
      {
        id: '2',
        type: 'product_update', 
        title: 'New Product Added',
        message: 'New product added: Handwoven Silk Saree',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        priority: 'medium',
        action_url: '/admin-dashboard/products',
        entity_id: 'product_1',
        user_id: null
      },
      {
        id: '3',
        type: 'gi_verification',
        title: 'GI Status Approved',
        message: 'Product "Banarasi Silk" GI status: Approved',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        priority: 'high',
        action_url: '/admin-dashboard/gi-tags',
        entity_id: 'product_2',
        user_id: null
      },
      {
        id: '4',
        type: 'gi_verification',
        title: 'GI Status Rejected',
        message: 'Product "Generic Carpet" GI status: Rejected',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        read: false,
        priority: 'high',
        action_url: '/admin-dashboard/gi-tags',
        entity_id: 'product_3',
        user_id: null
      }
    ];
    setNotifications(mockNotifications);
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time listener
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          console.log('Notification change detected, refetching...');
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Function to update notification read status
  const updateNotificationReadStatus = async (notificationId: string, isRead: boolean) => {
    try {
      const { data, error } = await supabase.rpc('update_notification_read_status', {
        notification_id: notificationId,
        is_read: isRead
      });

      if (error) {
        console.error('Error updating notification status:', error);
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ read: isRead })
          .eq('id', notificationId);
        
        if (updateError) {
          console.error('Fallback update failed:', updateError);
          return { success: false, error: updateError };
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in updateNotificationReadStatus:', error);
      return { success: false, error };
    }
  };

  // Update the markAsRead function to update the database
  const markAsRead = async (notificationId: string) => {
    try {
      // First update local state for immediate UI feedback
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Then update in database
      const { success, error } = await updateNotificationReadStatus(notificationId, true);
      
      if (!success) {
        throw error;
      }
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      
      // Revert the UI change if database update failed
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId && notification.read 
            ? { ...notification, read: false } 
            : notification
        )
      );
      
      toast.error('Failed to mark notification as read');
    }
  };

  // Update the markAllAsRead function to update the database
  const markAllAsRead = async () => {
    try {
      // Create a copy of the current state before making changes
      const previousNotifications = [...notifications];
      
      // Update local state first for immediate UI feedback
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Update each unread notification in the database
      const unreadNotificationIds = previousNotifications
        .filter(n => !n.read)
        .map(n => n.id);
        
      if (unreadNotificationIds.length === 0) {
        toast.info('No unread notifications to mark');
        return;
      }
      
      // Update each notification individually
      const updatePromises = unreadNotificationIds.map(id => 
        updateNotificationReadStatus(id, true)
      );
      
      const results = await Promise.all(updatePromises);
      const allSuccessful = results.every(result => result.success);
      
      if (!allSuccessful) {
        throw new Error('Some notifications could not be updated');
      }
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      
      // Revert to fetching from the database again in case of error
      fetchNotifications();
      
      toast.error('Failed to mark all notifications as read');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSecs < 60) {
      return `${diffInSecs} seconds ago`;
    } else if (diffInMins < 60) {
      return `${diffInMins} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vendor_update':
        return <UserCog className="h-5 w-5 text-blue-500" />;
      case 'product_update':
        return <Package className="h-5 w-5 text-green-500" />;
      case 'gi_verification':
        return <Shield className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getCategoryName = (type: string) => {
    switch (type) {
      case 'vendor_update':
        return 'Vendor Updates';
      case 'product_update':
        return 'Product Updates';
      case 'gi_verification':
        return 'GI Verification';
      default:
        return 'System';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AdminLayout title="Notifications" activeRoute="/admin-dashboard/notifications">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Manage system notifications and alerts ({unreadCount} unread)
            </p>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-border rounded-md px-3 py-2 bg-background"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="vendor_update">Vendor Updates</option>
              <option value="product_update">Product Updates</option>
              <option value="gi_verification">GI Verification</option>
            </select>
            
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No notifications found</p>
                <p>You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.read 
                        ? 'bg-background border-border' 
                        : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getCategoryName(notification.type)}</span>
                            <span>•</span>
                            <span>{formatDate(notification.created_at)}</span>
                            <span>•</span>
                            {getPriorityBadge(notification.priority)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {notification.action_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = notification.action_url!}
                          >
                            View
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          disabled={notification.read}
                        >
                          {notification.read ? '✓' : 'Mark Read'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Notifications;
