using { Currency, managed, sap } from '@sap/cds/common';
namespace sap.capire.bookshop;

entity Books : managed {
  key ID   : Integer;
  title    : localized String(111)  @mandatory;
  descr    : localized String(1111);
  author   : Association to Authors @mandatory;
  genre    : Association to Genres;
  unmanaged: Association to Genres on $self.genre.ID = unmanaged.ID;
  stock    : Integer;
  price    : Decimal;
  currency : Currency;
  image    : LargeBinary @Core.MediaType: 'image/png';
}

entity MPAARatings: sap.common.CodeList {
  key ID: String enum { PG13='PG13'; NC17='NC17'; R='R'; PG='PG'; G='G';};
}
entity Authors : managed {
  key ID       : Integer;
  name         : String(111) @mandatory;
  dateOfBirth  : Date;
  dateOfDeath  : Date;
  placeOfBirth : String;
  placeOfDeath : String;
  books        : Association to many Books on books.author = $self;
  available = books[stock > 0]; // < Works since 'stock' is a field of 'Authors'
  fiction = books[genre.ID = 10]; // < Works since 'genre' is a managed association and 'ID' is its target's key
  // fictionUnmanaged = books[unmanaged.ID = 10]; // < Error: Unexpected reference to an unmanaged association
  pg = books[genre.rating.ID = 'PG']; // < Error: Can follow managed association 'genre' only to the keys of its target, not to 'rating'
  pgUnmanaged = books[unmanaged.rating.ID = 'PG']; // < Error: Unexpected reference to an unmanaged association
}

entity P_Authors as projection on Authors {
  *,
  books[genre.rating.ID = 'PG13'] as pg13, // < Error: Can follow managed association 'genre' only to the keys of its target, not to 'rating'
  books[unmanaged.rating.ID = 'PG13'] as pg13Unmanaged // < Error: Unexpected reference to an unmanaged association
};

/** Hierarchically organized Code List for Genres */
entity Genres : sap.common.CodeList {
  key ID   : Integer;
  parent   : Association to Genres;
  children : Composition of many Genres on children.parent = $self;
  rating   : Association to many MPAARatings;
}
