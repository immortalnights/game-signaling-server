export const deleteItemFromArray = (array, item) => {
    let deleted;
    const index = array.indexOf(item);
    if (index === -1) {
        console.error("Failed to find item in array");
    }
    else {
        deleted = array.splice(index, 1);
    }
    return deleted;
};
export function throwError(...args) {
    throw new Error(...args);
}
