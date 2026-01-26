/**
 * MainLayout - Layout wrapper for authenticated pages
 * Includes TopBar and content area
 */
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

export const MainLayout = () => {
    return (
        <div className='min-h-screen bg-background flex flex-col'>
            <TopBar />
            <main className='flex-1 overflow-auto'>
                <Outlet />
            </main>
        </div>
    )
}

export default MainLayout
