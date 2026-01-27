/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

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
