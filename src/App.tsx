/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { AuthLayout } from './pages/auth/AuthLayout';
import { RoleSelect } from './pages/auth/RoleSelect';
import { OTPLogin } from './pages/auth/OTPLogin';
import { PasswordLogin } from './pages/auth/PasswordLogin';
import { Onboarding } from './pages/auth/Onboarding';

import { 
  CollectorLayout,
  CollectorDashboard, 
  AggregatorDashboard, 
  RecyclerDashboard, 
  AdminDashboard 
} from './pages/dashboards';

import { AddMaterial } from './pages/collector/AddMaterial';
import { MyLots } from './pages/collector/MyLots';
import { LotDetails } from './pages/collector/LotDetails';

import { CreatePickup } from './pages/collector/CreatePickup';

import { Contribution } from './pages/collector/Contribution';
import { Earnings } from './pages/collector/Earnings';
 
import { Assistant } from './pages/collector/Assistant';
import { CheckPrice } from './pages/collector/CheckPrice';
import { Profile } from './pages/collector/Profile';
import { PartnerSelection } from './pages/collector/PartnerSelection';
import { TransactionDraftProvider } from './context/TransactionDraftContext';

export default function App() {
  return (
    <AuthProvider>
      <TransactionDraftProvider>
      <BrowserRouter>
        <Routes>
          {/* Root redirect to Auth */}
          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* Auth Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route index element={<RoleSelect />} />
            <Route path="login-otp" element={<OTPLogin />} />
            <Route path="login-password" element={<PasswordLogin />} />
            <Route path="onboarding" element={<Onboarding />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route path="/collector" element={
            <ProtectedRoute allowedRoles={['collector']}>
              <CollectorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CollectorDashboard />} />
            <Route path="material" element={<AddMaterial />} />
            <Route path="pickup" element={<CreatePickup />} />
            <Route path="check-price" element={<CheckPrice />} />
            <Route path="partners" element={<PartnerSelection />} />
            <Route path="lots" element={<MyLots />} />
            <Route path="lots/:id" element={<LotDetails />} />
            <Route path="lots/:id/partners" element={<PartnerSelection />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="contribution" element={<Contribution />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          <Route path="/aggregator" element={
            <ProtectedRoute allowedRoles={['aggregator']}>
              <AggregatorDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/recycler" element={
            <ProtectedRoute allowedRoles={['recycler']}>
              <RecyclerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Catch all redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </TransactionDraftProvider>
    </AuthProvider>
  );
}
