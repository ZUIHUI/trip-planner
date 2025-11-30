CREATE TABLE trips (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

CREATE TABLE accommodations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    name VARCHAR(200),
    address VARCHAR(300),
    check_in DATETIME,
    check_out DATETIME,
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE TABLE flights (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    direction ENUM('outbound', 'inbound'),
    code VARCHAR(20),
    airline VARCHAR(50),
    date DATE,
    time VARCHAR(20),
    departure VARCHAR(20),
    arrival VARCHAR(20),
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE TABLE itinerary_days (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    day_number INT NOT NULL,
    date DATE,
    title VARCHAR(200),
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE TABLE events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    day_id BIGINT NOT NULL,
    time TIME,
    type VARCHAR(50),
    title VARCHAR(200),
    location VARCHAR(200),
    description TEXT,
    urgent BOOLEAN DEFAULT FALSE,
    transport_mode VARCHAR(50),
    transport_duration VARCHAR(30),
    transport_route VARCHAR(200),
    FOREIGN KEY (day_id) REFERENCES itinerary_days(id)
);

CREATE TABLE event_memos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    memo_text VARCHAR(300),
    done BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (event_id) REFERENCES events(id)
);

