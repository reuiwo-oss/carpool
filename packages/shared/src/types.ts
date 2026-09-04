/**
 * Typy współdzielone między API, webem i przyszłą aplikacją mobilną.
 * Jedno źródło prawdy dla kształtu danych.
 */

/**
 * FREE / TAKEN / PENDING / DRIVER przychodzą z API. MINE wyliczamy po stronie
 * klienta dla potwierdzonego miejsca zalogowanego pasażera.
 *
 * PENDING widzą tylko zainteresowani — pasażer, który poprosił, i kierowca,
 * który ma zdecydować. Dla reszty miejsce jest po prostu zajęte.
 */
export type SeatStatus = 'FREE' | 'TAKEN' | 'PENDING' | 'DRIVER' | 'MINE';

/** Zdarzenia rysują się w wątku inaczej niż zwykła wiadomość. */
export type MessageKind = 'TEXT' | 'REQUEST' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface Seat {
  /** np. "front-right", "rear-left" — stabilny identyfikator miejsca */
  id: string;
  label: string;
  /** pozycja na schemacie auta (siatka: kolumna x, rząd y) */
  x: number;
  y: number;
  status: SeatStatus;
  /** Imię osoby na tym miejscu — API podaje je uczestnikom wycieczki. */
  who?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  kind: MessageKind;
  body: string;
  /** Miejsce, którego dotyczy zdarzenie — etykieta w wątku. */
  seatId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** Wątek uczestnik ↔ kierowca w kontekście jednej wycieczki. */
export interface Conversation {
  id: string;
  tripId: string;
  /** Druga strona rozmowy z perspektywy pytającego. */
  withName: string;
  trip: {
    id: string;
    title: string;
    destination: string;
    startsAt: string;
  };
  /** Stan rezerwacji, o ile wciąż istnieje — odmowa i rezygnacja ją kasują. */
  reservationStatus: ReservationStatus | null;
  reservationId: string | null;
  seatId: string | null;
  seatLabel: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

/** Zalogowany użytkownik. Bez roli — ta wynika z udziału w wycieczce. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wycieczka, auta, rezerwacje
//
// Kształty spisane z tego, co zwraca API: daty jako ISO, relacje spłaszczone
// do tego, co ekran faktycznie rysuje. Odpowiedniki enumów z bazy są uniami
// stringów — te same wartości, bez zależności od klienta Prismy.
// ─────────────────────────────────────────────────────────────────────────────

export type TripVisibility = 'PUBLIC' | 'LINK_ONLY' | 'PRIVATE';
export type TripStatus = 'OPEN' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
export type LegDirection = 'OUTBOUND' | 'RETURN';
export type ReservationLegs = 'BOTH' | 'OUTBOUND_ONLY' | 'RETURN_ONLY';
export type RequestStatus = 'OPEN' | 'FULFILLED' | 'EXPIRED';

/** Prośba czeka na kierowcę auta; akceptacja ją domyka. */
export type ReservationStatus = 'PENDING' | 'ACCEPTED';

/**
 * Rola w wycieczce nie jest zapisywana — wylicza się z danych
 * (patrz `deriveParticipantRoles`). Jedna osoba może mieć kilka ról naraz:
 * organizator, który dołożył własne auto, jest jednocześnie kierowcą.
 */
export type ParticipantRole = 'ORGANIZER' | 'DRIVER' | 'PASSENGER' | 'LOOKING_FOR_SEAT';

/** Auto w garażu użytkownika — niezależne od pojedynczej wycieczki. */
export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  /** Klucz z INTERIORS — z niego wynikają liczba miejsc i kształt schematu. */
  interior: string;
  seatLayout: Seat[];
  createdAt: string;
}

/** Odcinek trasy auta: dojazd albo powrót. */
export interface RideLeg {
  id: string;
  rideId: string;
  direction: LegDirection;
  /** Miejsce zbiórki na tym odcinku. */
  origin: string;
  departureAt: string;
  arrivalAt: string | null;
}

export interface SeatReservation {
  id: string;
  rideId: string;
  userId: string;
  seatId: string;
  legs: ReservationLegs;
  status: ReservationStatus;
  createdAt: string;
}

/** Auto zgłoszone do wycieczki — jedno na uczestnika, na całą wycieczkę. */
export interface TripRide {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  /** Kopia z pojazdu — schemat rysuje się tak, jak w chwili zgłoszenia auta. */
  interior: string;
  note: string | null;
  /** Snapshot układu nałożony na rezerwacje — gotowy dla `SeatMap`. */
  seats: Seat[];
  legs: RideLeg[];
  reservations: SeatReservation[];
}

export interface TripParticipant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  isOrganizer: boolean;
  joinedAt: string;
  /** Wynik `deriveParticipantRoles` — API podaje go gotowego. */
  roles: ParticipantRole[];
}

/** Wycieczka na liście: bez uczestników i aut, z podliczeniami. */
export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  startsAt: string;
  endsAt: string;
  visibility: TripVisibility;
  status: TripStatus;
  createdById: string;
  organizerName: string;
  /** Suma wolnych foteli we wszystkich autach wycieczki. */
  freeSeats: number;
  participantsCount: number;
  /** Role zalogowanego użytkownika — wypełnione tylko w `GET /trips/mine`. */
  myRoles?: ParticipantRole[];
}

/** Pełne szczegóły wycieczki — `GET /trips/:id`. */
export interface Trip extends TripSummary {
  description: string | null;
  createdAt: string;
  participants: TripParticipant[];
  rides: TripRide[];
}

/** Historia i plany zalogowanego użytkownika — `GET /trips/mine`. */
export interface MyTrips {
  upcoming: TripSummary[];
  past: TripSummary[];
}

/** „Chcę jechać, ale nie ma jeszcze takiej wycieczki". */
export interface RideRequest {
  id: string;
  userId: string;
  userName: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  seatsNeeded: number;
  note: string | null;
  status: RequestStatus;
  createdAt: string;
}
