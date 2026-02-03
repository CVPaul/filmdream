import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ToastContainer from './ToastContainer'

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Toast 通知 */}
      <ToastContainer />
    </div>
  )
}
