# Student Attendance Tracker - Frontend

A modern, responsive web application for tracking student attendance built with React.js and Vite.

## Features

### ✅ Admin Authentication Module
- **Registration Form**: Full Name, Email, Password, and Confirm Password fields
- **Login Form**: Email and Password fields
- **Form Validation**: Real-time validation with error messages
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Toast Notifications**: Success and error alerts using react-toastify
- **Protected Routes**: Dashboard access only for authenticated admins

### 🎨 Modern UI/UX
- Clean and intuitive interface
- Smooth animations and transitions
- Gradient backgrounds and modern card designs
- Responsive grid layouts
- Loading states and spinners

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and development server
- **React Router DOM** - Client-side routing
- **React Toastify** - Toast notifications
- **CSS3** - Modern styling with animations

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:5173`

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Register.jsx      # Admin registration component
│   │   │   ├── Login.jsx         # Admin login component
│   │   │   └── Auth.css          # Authentication styles
│   │   └── Dashboard/
│   │       ├── AdminDashboard.jsx # Admin dashboard component
│   │       └── Dashboard.css     # Dashboard styles
│   ├── App.jsx                   # Main app component with routing
│   ├── App.css                   # Global app styles
│   ├── main.jsx                  # App entry point
│   └── index.css                 # Base styles
├── public/                       # Static assets
├── package.json                  # Dependencies and scripts
└── vite.config.js               # Vite configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend is prepared to integrate with a backend API. Currently, the API calls are commented as TODO placeholders:

- `POST /api/admin/register` - Admin registration
- `POST /api/admin/login` - Admin login

## Features in Detail

### Registration Form
- **Full Name**: Required, minimum 2 characters
- **Email**: Required, valid email format
- **Password**: Required, minimum 6 characters
- **Confirm Password**: Required, must match password
- Real-time validation with error messages
- Loading state during submission

### Login Form
- **Email**: Required, valid email format
- **Password**: Required
- JWT token storage in localStorage
- Automatic redirect to dashboard on success

### Admin Dashboard
- **Header**: Welcome message and logout button
- **Statistics Cards**: Total students, today's attendance, monthly average
- **Quick Actions**: Buttons for common tasks
- **Recent Activity**: Placeholder for activity feed
- **Responsive Design**: Adapts to different screen sizes

## Styling

The application uses modern CSS with:
- CSS Grid and Flexbox for layouts
- CSS Custom Properties for theming
- Smooth transitions and animations
- Mobile-first responsive design
- Custom scrollbars
- Focus states for accessibility

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- The application uses localStorage for token storage (in production, consider more secure alternatives)
- Form validation is client-side only (server-side validation should be implemented)
- API endpoints are currently mocked (replace with actual backend URLs)
- The dashboard shows placeholder data (connect to real data sources)

## Next Steps

1. **Backend Integration**: Connect to Node.js/Express backend
2. **Database**: Integrate with MongoDB
3. **Student Management**: Add student CRUD operations
4. **Attendance Tracking**: Implement attendance marking system
5. **Reports**: Add attendance reports and analytics
6. **Authentication**: Implement proper JWT handling
7. **Testing**: Add unit and integration tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
