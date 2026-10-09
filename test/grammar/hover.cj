// SYNTAX TEST "source.cangjie" "the code of a hover, which gets no semantic tokens: what the grammar alone colors"

public func get(index: Int64): ?ArrayList<T>
// <------ storage.modifier.cangjie
//     ^^^^ storage.type.cangjie
//          ^^^ entity.name.function.cangjie
//              ^^^^^ variable.parameter.cangjie
//                     ^^^^^ support.type.primitive.cangjie
//                             ^ keyword.operator.cangjie
//                              ^^^^^^^^^ entity.name.type.cangjie
//                                        ^ entity.name.type.cangjie

func find<K, V>(key!: K, by!: (K) -> Bool): Option<V> where K <: Hashable & Equatable<K>
//   ^^^^ entity.name.function.cangjie
//        ^ entity.name.type.cangjie
//              ^^^ variable.parameter.cangjie
//                 ^ keyword.operator.cangjie
//                       ^^ variable.parameter.cangjie
//                                   ^^^^ support.type.primitive.cangjie
//                                          ^^^^^^ entity.name.type.cangjie
//                                                    ^^^^^ keyword.control.cangjie
//                                                               ^^^^^^^^ entity.name.type.cangjie

public class HashMap<K, V> <: Map<K, V>
//     ^^^^^ storage.type.cangjie
//           ^^^^^^^ entity.name.type.cangjie
//                         ^^ keyword.operator.cangjie
//                            ^^^ entity.name.type.cangjie

struct HoverItem
// <------ storage.type.cangjie
//     ^^^^^^^^^ entity.name.type.cangjie

HoverItem(public let range: TextRange, var doc: ?String)
// <--------- entity.name.type.cangjie
//        ^^^^^^ storage.modifier.cangjie
//               ^^^ storage.type.cangjie
//                   ^^^^^ variable.other.cangjie
//                          ^^^^^^^^^ entity.name.type.cangjie
//                                     ^^^ storage.type.cangjie
//                                         ^^^ variable.other.cangjie
//                                               ^^^^^^ entity.name.type.cangjie

let x: Int64
// <--- storage.type.cangjie
//  ^ variable.other.cangjie
//     ^^^^^ support.type.primitive.cangjie

static const MAX: Int64
// <------ storage.modifier.cangjie
//     ^^^^^ storage.type.cangjie
//           ^^^ variable.other.constant.cangjie

public mut prop size: Int64
//     ^^^ storage.modifier.cangjie
//         ^^^^ storage.type.cangjie
//              ^^^^ variable.other.property.cangjie

n: Int64
// <- variable.parameter.cangjie

std.collection.ArrayList
//             ^^^^^^^^^ entity.name.type.cangjie

twice(n * 2)
// <----- entity.name.function.cangjie
//    ^ - variable.parameter.cangjie
