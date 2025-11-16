# NGO Portal - Impact Analytics & Reports

## Overview
Comprehensive analytics dashboard for NGOs to track environmental impact, campaign performance, and volunteer engagement with real-time data from Firebase Firestore.

## Features

### 📊 Key Performance Metrics
- **Total Campaigns**: Count of all campaigns (active and inactive)
- **Unique Participants**: Citizens engaged across all campaigns
- **Total Actions**: Environmental actions logged by participants
- **Volunteer Hours**: Aggregate community service hours
- **Volunteer Events**: Active and completed volunteer opportunities
- **Engagement Rate**: Average participants per campaign

### 🌱 Environmental Impact Tracking
Real data from Firebase collections:
- **CO₂ Emissions Prevented**: Calculated from user actions
- **Plastic Items Saved**: Tracked from waste reduction campaigns
- **Food Waste Prevented**: From food conservation actions
- **Energy Conserved**: kWh saved through energy campaigns
- **Water Conserved**: Liters saved from conservation actions
- **Trees Planted**: From volunteer tree-planting events
- **Items Recycled**: Materials diverted from landfills
- **Community Service Hours**: Volunteer time contribution

### 📈 Data Visualizations
1. **Category Breakdown**
   - Actions, participants, and impact score by category
   - Visual progress bars showing relative performance
   - Categories: Plastic Reduction, Food Waste, Energy Saving, Transportation, Recycling, Water Conservation, Volunteer Events

2. **Monthly Engagement Trends**
   - 6-month historical view
   - Three metrics: Participants, Actions, Volunteer Hours
   - Interactive bar chart with hover tooltips

3. **Top Performing Campaigns**
   - Ranked by participant count
   - Shows category, actions, and engagement metrics
   - Trophy icons for top 3 campaigns

4. **Top Volunteers**
   - Ranked by total service hours
   - Shows events attended and average hours per event
   - Medal icons for top 3 volunteers

### 📄 Impact Summary for Stakeholders
Auto-generated narrative report including:
- Community engagement statistics
- Environmental outcomes with equivalents (trees planted, meals saved, etc.)
- Program success metrics
- Retention and completion rates

### 🔄 Timeframe Filtering
- Week
- Month
- Year
- All Time

### 📥 Export Options
1. **JSON Export**: Complete analytics data for integration
2. **CSV Export**: Category breakdown for spreadsheet analysis

## Data Sources

### Firebase Collections Used
- `challenges` - Campaign data and participation
- `volunteerEvents` - Volunteer opportunity information
- `volunteerProfiles` - Individual volunteer hours and attendance
- `actions` - Environmental actions and their impact
- `userStats` - Aggregated user statistics
- `users` - User profiles and contact information

### Real-Time Updates
All data is fetched in real-time from Firebase on page load, ensuring stakeholders always see current metrics.

## Technical Implementation

### State Management
- React hooks for data state
- Loading states for async operations
- Role-based authentication (NGO users only)

### Data Processing
- Aggregate calculations from multiple collections
- Set-based unique participant counting
- Monthly trend generation from historical data
- Top performer ranking algorithms

### Performance
- Efficient querying with Firebase snapshots
- Client-side sorting and filtering
- Optimized re-renders with React memo patterns

## Access Control
- **NGO Users Only**: Redirects non-NGO users to dashboard
- **Authentication Required**: Redirects unauthenticated users to login

## Usage

### Navigation
1. From NGO Portal Dashboard: Click "View Full Analytics" in Impact Analytics section
2. From NGO Header: Click "Analytics & Reports" in navigation menu
3. Direct URL: `/ngo-portal/analytics`

### Generating Reports
1. Select desired timeframe (Week/Month/Year/All Time)
2. Review metrics and visualizations
3. Click "Export Report" for JSON data or "Export CSV" for spreadsheet format
4. Use the Impact Summary section for stakeholder presentations

## Future Enhancements
- [ ] PDF report generation with charts
- [ ] Email report scheduling
- [ ] Custom date range selection
- [ ] Campaign comparison tool
- [ ] Volunteer certificate generation
- [ ] Geographic impact mapping
- [ ] Social media share cards
- [ ] API endpoint for third-party integrations

## Support
For issues or feature requests related to analytics, contact the development team or file an issue in the project repository.
