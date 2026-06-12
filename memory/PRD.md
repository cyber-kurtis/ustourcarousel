# Booking Directory - PRD

## Overview
A Booking.com-style mobile app (React Native / Expo) acting as a hotel directory. Browse hotels, view details, contact via phone/email/maps. No reservations, no dates, no pricing.

## Features
- Home screen: vertical scroll of hotel cards (image + name "yapışık" / flush — no gap)
- Hotel detail screen: hero image + name + description + 3 action buttons
  - Konum: opens Google Maps with hotel name + address
  - Telefon: opens dialer with `tel:`
  - E-posta: opens mail client with `mailto:`
- Backend: FastAPI + MongoDB, seeded with 8 Turkish hotels on startup

## Design
- Booking.com brand colors (#003580 primary, #0071C2 secondary, #E6F0F9 tertiary)
- Turkish UI throughout
- iOS-Native Clean personality, Ionicons

## API
- `GET /api/hotels` — list all hotels
- `GET /api/hotels/{id}` — single hotel
- `POST /api/hotels` — create hotel (admin/future use)

## Stack
- Backend: FastAPI, Motor (MongoDB), Pydantic
- Frontend: Expo Router, expo-image, expo-linear-gradient, Ionicons, Linking
