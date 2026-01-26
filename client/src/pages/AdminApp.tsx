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
import AdminDashboard from "./admin/AdminDashboard";
import RatingsManagement from "./RatingsManagement";
import WalletManagement from "./WalletManagement";
import NotFound from "./not-found";
import React from "react";

// Admin App Component
interface AdminAppProps {
  onLogout: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = () => {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
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
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
};

export default AdminApp;
