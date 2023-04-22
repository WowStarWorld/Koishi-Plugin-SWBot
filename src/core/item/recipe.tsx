import { ItemStack, Item } from "./index";
import { BaseEvent } from "../event";
import { Player } from "../player";

import _ from "lodash";
import { Identifier } from "../utils";
import { NBTCompound } from "../nbt";

export class ItemCraftEvent extends BaseEvent {

    constructor (public event: BaseEvent) {
        super ();
    }

}

export class Recipe {

    recipes: { id: string; nbt?: NBTCompound, count: number }[] = [];

    constructor (public result: ItemStack) {}

    recipe (...recipe: typeof this.recipes) {
        for (let i of recipe) {
            let next = true;
            for (let recipeIndex of Object.keys(this.recipes).map(i => Number(i))) {
                let recipe = this.recipes[recipeIndex];
                if (i.id == recipe.id && _.isEqual(i.nbt, recipe.nbt)) {
                    this.recipes[recipeIndex].count += i.count;
                    next = false;
                    break;
                }
            }
            if (next) this.recipes.push(i);
        }
        return this;
    }

    async craft (player: Player, event?: BaseEvent) {
        for (let i of this.recipes) {
            if (await player.countItem(i.id, i.nbt) < i.count) return {type: "insufficient.items", require: new ItemStack(i.id, Math.abs(i.count - await player.countItem(i.id, i.nbt)), i.nbt), recipe: i};
        }
        for (let i of this.recipes) {
            await player.drop(i.id, i.count, i.nbt);
        }
        await player.give(this.result);
        return {type: "success", recipes: this.recipes, result: this.result};
    }

}

export namespace Recipe {

    export const all: Recipe[] = [];

    export function register (recipe: Recipe) {
        all.push(recipe);
        return recipe;
    }

    export function findByResult (id: string | Identifier, nbt?: NBTCompound) {
        return getRecipes().filter(i => i.result.id == String(id) && nbt ? _.isEqual(nbt, i.result.nbt) : true);
    }

    export function getRecipes () {
        let newRecipes = _.clone(all);
        for (let i of Item.all) {
            for (let t of Item.all) {
                for (let transform of i.settings.data.transform) {
                    if (i.settings.data.transform.includes(transform)) {
                        newRecipes.push(new Recipe(new ItemStack(String(t.id), 1, {})).recipe({id: String(i.id), nbt: {}, count: 1}));
                    }
                }
            }
        }
        return newRecipes;
    }

}

export namespace Recipes {
    
    export const IRON_INGOT = Recipe.register(new Recipe(new ItemStack("swbot:iron_ingot", 1)).recipe({id: "swbot:iron_ingot", count: 1}));
    
}
