package fixture

import std.deriving.*

@Derive[Equatable]
class Point {
    Point(let x: Int64, let y: Int64) {}
}
