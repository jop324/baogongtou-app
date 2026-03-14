import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Overview from './pages/Overview';
import Workers from './pages/Workers';
import Attendance from './pages/Attendance';
import Construction from './pages/Construction';
import Expenses from './pages/Expenses';
import Statistics from './pages/Statistics';
import Export from './pages/Export';

const navItems = [
  { path: '/', label: '首页', icon: '📊' },
  { path: '/workers', label: '工人管理', icon: '👷' },
  { path: '/attendance', label: '考勤管理', icon: '📅' },
  { path: '/construction', label: '施工记录', icon: '🏗️' },
  { path: '/expenses', label: '支出记录', icon: '💰' },
  { path: '/statistics', label: '统计查询', icon: '📈' },
  { path: '/export', label: '导出中心', icon: '📤' },
];

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center">
            <span className="text-lg font-bold">🏗️ 包工头管理系统</span>
          </div>
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  location.pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/construction" element={<Construction />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/export" element={<Export />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
