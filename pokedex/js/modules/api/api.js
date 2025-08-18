"use strict";

// alle imports
import { config, generationMap } from "../constants.js";
import { renderPokemonIndex, showInfo } from "../ui/renderPokemon.js";
import { capitalize } from "../utils.js";
import { t } from "../langSelect.js";

// fetch alle pokemon t/m pokemon 898
export async function fetchPokemon(lang) {
  const allPokemonContainer = document.getElementById("number-index");
  allPokemonContainer.innerHTML = ""; // zodat je geen dubbele index krijgt bij het switchen van taal

  const response = await fetch(
    "https://pokeapi.co/api/v2/pokemon/?limit=898",
    config,
  );
  const allpokemon = await response.json();
  const allResults = allpokemon.results;

  // grootte van de batch
  const initialBatchSize = 20;
  const restBatchSize = 25;

  // Om de eerste 20 pokemon te laten zien in de index
  const initialBatch = allResults.slice(0, initialBatchSize);
  const initialData = await Promise.all(
    initialBatch.map((p) => fetchPokemonData(p, lang)),
  );
  const firstValid = initialData.filter(Boolean);

  firstValid.forEach(renderPokemonIndex);

  // laat standaard bulbasaur zien als de pagina geopend word
  if (firstValid[0]) {
    showInfo(firstValid[0]);
  }

  for (let i = initialBatchSize; i < allResults.length; i += restBatchSize) {
    const batch = allResults.slice(i, i + restBatchSize);
    const results = await Promise.all(
      batch.map((p) => fetchPokemonData(p, lang)),
    );
    results.filter(Boolean).forEach(renderPokemonIndex);
  }
}

// functie om de data per pokemon te fetchen
export function fetchPokemonData(pokemon, lang) {
  return fetch(pokemon.url)
    .then((response) => {
      if (!response.ok) throw new Error("Network error while fetching Pokémon");
      return response.json();
    }) // om de omschrijving te krijgen en te zien of het een mythical of legendary pokemon is
    .then((pokeData) => {
      return fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokeData.id}`)
        .then((response) => {
          if (!response.ok)
            throw new Error("Network error while fetching species");
          return response.json();
        })
        .then((speciesData) => {
          // naam van pokemon "vertalen"
          const localizedName = speciesData.names.find(
            (n) => n.language.name === lang,
          );
          pokeData.localized_name = localizedName
            ? localizedName.name
            : pokeData.name;

            // omschrijving/flavor text van pokemon "vertalen"
          const localizedDesc = speciesData.flavor_text_entries.find(
            (entry) => entry.language.name === lang,
          );
          pokeData.flavor_text = localizedDesc
            ? localizedDesc.flavor_text.replace(/\f/g, " ")
            : speciesData.flavor_text_entries
                .find((e) => e.language.name === "en")
                ?.flavor_text.replace(/\f/g, " ") || t("no_description");

          pokeData.isLegendary = speciesData.is_legendary; // legendary of niet
          pokeData.isMythical = speciesData.is_mythical; // mythical of niet
          pokeData.generation = speciesData.generation.name; // de generatie van pokemon
          pokeData.evolutionUrl = speciesData.evolution_chain.url; // evolutie ophalen

          return pokeData;
        });
    })
    .catch((error) => {
      console.error(`Error with fetching ${pokemon.name}:`, error);
    });
}

// generatie en regio
export async function fetchGenerationRegions() {
  const response = await fetch("https://pokeapi.co/api/v2/generation/", config);
  const data = await response.json();

  const generationPromises = data.results.map((gen) =>
    fetch(gen.url).then((res) => res.json()),
  );

  const generations = await Promise.all(generationPromises);

  generations.forEach((genData) => {
    const genKey = genData.name;
    const regionName = capitalize(genData.main_region.name);
    generationMap.set(genKey, regionName);
  });
}

export async function enrichWithLocalization(pokeData, lang) {
  const speciesRes = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species/${pokeData.id}`,
  );
  const speciesData = await speciesRes.json();

  const localizedName = speciesData.names.find((n) => n.language.name === lang);
  pokeData.localized_name = localizedName ? localizedName.name : pokeData.name;

  const localizedDesc = speciesData.flavor_text_entries.find(
    (entry) => entry.language.name === lang,
  );
  pokeData.flavor_text = localizedDesc
    ? localizedDesc.flavor_text.replace(/\f/g, " ")
    : speciesData.flavor_text_entries
        .find((e) => e.language.name === "en")
        ?.flavor_text.replace(/\f/g, " ") || pokeData.name;

  return pokeData;
}
