"""
Frontend Components TypeScript stubs
This file documents what needs to be created in the frontend
"""

# Components to create:

1. src/components/trader/TraderProfileCard.tsx
   - Display trader info in compact card format
   - Show avatar, name, success rate, rating
   - Used in P2P listings

2. src/components/trader/TraderProfileView.tsx
   - Full profile page view
   - All details: bio, stats, payment methods, limits
   - Buttons to contact/trade with trader

3. src/components/trader/TraderProfileForm.tsx
   - Create/Edit trader profile form
   - Input fields for all profile data
   - Avatar upload support

4. src/components/trader/TraderStats.tsx
   - Display trader statistics
   - Charts/graphs of performance
   - Recent reviews

5. src/pages/p2p/TraderSetup.tsx
   - Page for creating initial trader profile
   - Guided form

6. src/pages/p2p/TraderProfile.tsx
   - Public trader profile page
   - Dynamic route with [id] parameter

7. src/pages/p2p/TraderProfileEdit.tsx
   - Edit trader profile page
   - Update existing profile

8. src/hooks/useTraderProfile.ts
   - Custom hook for API calls
   - CRUD operations for trader profiles

9. src/services/traderProfileService.ts
   - API service class
   - All endpoint calls
