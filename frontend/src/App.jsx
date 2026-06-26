import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import InvoiceList from './pages/InvoiceList'
import InvoiceDetail from './pages/InvoiceDetail'
import Analytics from './pages/Analytics'
import Modify from './pages/Modify'
import NaturalQuery from './pages/NaturalQuery'
import BackgroundPreview from './pages/BackgroundPreview'
import Login from './pages/Login'
import UserManagement from './pages/UserManagement'
import PurchaseOrders from './pages/PurchaseOrders'
import ItemCodes from './pages/ItemCodes'
import POMatching from './pages/POMatching'
import TrackingDashboard from './pages/TrackingDashboard'
import InventoryDashboard from './pages/InventoryDashboard'
import TraceWorkflow from './pages/TraceWorkflow'
import TraceProcess from './pages/TraceProcess'
import TraceInventory from './pages/TraceInventory'
import ManageTracking from './pages/ManageTracking'
import PlaceholderPage from './pages/PlaceholderPage'
import RegisterInventory from './pages/RegisterInventory'
import SearchInventory from './pages/SearchInventory'
import CreatePWS from './pages/CreatePWS'
import { AuthProvider } from './context/AuthContext'
import { UploadProvider } from './context/UploadContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

export default function App() {
  return (
    <AuthProvider>
      <UploadProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Top Header Links */}
              <Route path="/help" element={<PlaceholderPage title="Help & Support" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />

              {/* Ask AI Link */}
              <Route path="/query" element={<NaturalQuery />} />

              {/* Inventory Routes */}
              <Route path="/upload" element={<Navigate to="/inventory/dashboard" replace />} />
              <Route path="/invoices" element={<Navigate to="/inventory/dashboard" replace />} />
              <Route path="/inventory/register/:id?" element={<Navigate to="/inventory/dashboard" replace />} />
              <Route path="/inventory/search" element={<Navigate to="/inventory/dashboard" replace />} />
              <Route path="/inventory/dashboard" element={<InventoryDashboard />} />

              {/* Track & Trace Routes */}
              <Route path="/tracking" element={<TrackingDashboard />} />
              <Route path="/tracking/trace-inv" element={<TraceInventory />} />
              <Route path="/tracking/workflow" element={<TraceWorkflow />} />
              <Route path="/tracking/process" element={<TraceProcess />} />
              <Route path="/tracking/manage" element={<ManageTracking />} />
              {/* App Management Routes */}
              <Route path="/users" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
              <Route path="/app-management/create-pws" element={<CreatePWS />} />

              {/* Billing & Payments Routes */}
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/billing/summary" element={<PlaceholderPage title="Billing Summary" />} />
              <Route path="/billing/history" element={<PlaceholderPage title="Billing History" />} />
              <Route path="/billing/register" element={<PlaceholderPage title="Billing Register" />} />
              <Route path="/billing/manage" element={<PlaceholderPage title="Manage Billing" />} />

              {/* Other Existing Routes */}
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/preview-bg" element={<BackgroundPreview />} />
              <Route path="/modify" element={<ProtectedRoute requireUpload={true}><Modify /></ProtectedRoute>} />
              <Route path="/item-codes" element={<ItemCodes />} />
              <Route path="/po-matching" element={<POMatching />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </UploadProvider>
    </AuthProvider>
  )
}
