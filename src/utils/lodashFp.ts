// Local implementations of lodash/fp functions
export function flow<T>(...fns: Array<(arg: any) => any>): (arg: T) => any {
    return (arg: T) => fns.reduce((result, fn) => fn(result), arg);
}

export function sortBy<T>(iteratee: (item: T) => any): (collection: T[]) => T[] {
    return (collection: T[]) =>
        [...collection].sort((a, b) => {
            const aVal = iteratee(a);
            const bVal = iteratee(b);
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        });
}

export function reduce<T, U>(iteratee: (accumulator: U, item: T) => U, initial: U): (collection: T[]) => U {
    return (collection: T[]) => collection.reduce(iteratee, initial);
}
