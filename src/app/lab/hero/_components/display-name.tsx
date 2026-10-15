import { Fragment } from "react";

/**
 * The name at display size. Each word stays whole, so "Austin-Cruse"
 * never breaks at its hyphen; lines only break at the spaces between words.
 */
export function DisplayName({ name }: { name: string }) {
  return name.split(" ").map((word, i) => (
    <Fragment key={word}>
      {i > 0 && " "}
      <span className="whitespace-nowrap">{word}</span>
    </Fragment>
  ));
}
