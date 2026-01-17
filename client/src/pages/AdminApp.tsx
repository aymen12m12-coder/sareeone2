import { Switch, Route } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDrivers from "./AdminDrivers";
import AdminOrders from "./AdminOrders";
import AdminRestaurants from "./AdminRestaurants";
import AdminMenuItems from "./AdminMenuItems";
import AdminOffers from "./AdminOffers";
import AdminCategories from "./AdminCategories";
import AdminUsers from "./AdminUsers";
import AdminProfile from "./AdminProfile";
import AdminUiSettings from "./admin/AdminUiSettings";
import AdminFinancialReports from "./AdminFinancialReports"; 
import AdminHRManagement from "./AdminHRManagement"; 
import AdminSecurity from "./AdminSecurity"; 
import AdminDriversAdvanced from "./AdminDriversAdvanced";
import AdminRestaurantsAdvanced from "./AdminRestaurantsAdvanced";
import RatingsManagement from "./RatingsManagement";
import WalletManagement from "./WalletManagement";
import AdminDeliveryFees from "./admin/AdminDeliveryFees";
import AdminRestaurantAccounts from "./admin/AdminRestaurantAccounts";
import NotFound from "./not-found";
import React from "react";

// Admin Overview Page Component
const AdminOverview = () => {
  const stats = [
    { title: 'إجمالي الطلبات', value: '2,345', icon: 'ShoppingBag', color: 'text-blue-600' },
    { title: 'العملاء النشطين', value: '1,234', icon: 'Users', color: 'text-green-600' },
    { title: 'إجمالي المبيعات', value: '45,678 ر.ي', icon: 'DollarSign', color: 'text-orange-600' },
    { title: 'السائقين المتاحين', value: '23', icon: 'Truck', color: 'text-purple-600' },
  ];

  return (
    <div className="p-6" data-testid="page-admin-overview">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">نظرة عامة على النظام</h1>
        <p className="text-gray-600">ملخص شامل لحالة النظام والإحصائيات</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                <div className={`w-6 h-6 ${stat.color}`}>📊</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">الطلبات الحديثة</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((order) => (
                <div key={order} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">طلب #{1000 + order}</p>
                    <p className="text-sm text-gray-600">مطعم الوزيكو للعربكة</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                    قيد التحضير
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">السائقين النشطين</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {['أحمد محمد', 'علي حسن', 'سارة أحمد'].map((driver, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{driver}</p>
                    <p className="text-sm text-gray-600">متاح للتوصيل</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                    نشط
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminAppProps {
  onLogout: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = () => {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminOverview} />
        <Route path="/admin/dashboard" component={AdminOverview} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/restaurants" component={AdminRestaurants} />
        <Route path="/admin/menu-items" component={AdminMenuItems} />
        <Route path="/admin/drivers" component={AdminDrivers} />
        <Route path="/admin/drivers-advanced" component={AdminDriversAdvanced} />
        <Route path="/admin/restaurants-advanced" component={AdminRestaurantsAdvanced} />
        <Route path="/admin/offers" component={AdminOffers} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/profile" component={AdminProfile} />
        <Route path="/admin/financial-reports" component={AdminFinancialReports} />
        <Route path="/admin/hr-management" component={AdminHRManagement} />
        <Route path="/admin/security" component={AdminSecurity} />
        <Route path="/admin/ui-settings" component={AdminUiSettings} />
        <Route path="/admin/ratings" component={RatingsManagement} />
        <Route path="/admin/wallet" component={WalletManagement} />
        <Route path="/admin/delivery-fees" component={AdminDeliveryFees} />
        <Route path="/admin/restaurant-accounts" component={AdminRestaurantAccounts} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
};

export default AdminApp;
