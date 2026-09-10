---
name: writing-specifications
description: >
  Rules for writing technical documentation and specifications. Apply this skill
  when creating or editing spec/, docs/, README or other documents describing
  data formats, protocols, key systems, architectures or APIs. Language-independent.
  Triggers: "write a spec", "document the format", "describe how it works",
  "create a spec", any request for a .md file describing a system or protocol.
---

# Writing Documentation and Specifications

## Core principle: spec as a contract, not a note

A specification must be self-contained. Someone reading it for the first time,
with no prior knowledge of the project history, must be able to implement it
or work from it. Never reference "the previous version", "earlier decisions",
or context not contained in the document itself.

---

## No implementation status, no roadmap

A spec describes how the system behaves, not how far the implementation has got.
What is not built yet, what is built "so far", and what is planned belong in a
backlog or roadmap -- artifacts that have a process for staying current. A spec
has no such process: nobody revisits a document about topic X on the day
feature Y ships.

That asymmetry makes status claims uniquely corrosive. They are the sentences
most likely to become false and the least likely to be noticed when they do,
because they usually concern a topic the document does not otherwise cover --
so the reader has no reason to distrust them, and the person implementing that
other topic has no reason to look here:

```
// BAD -- in a spec about card payments
The `CARD` method is currently the only payment method that supports refunds.
Payments by `TRANSFER`, `CASH` and `VOUCHER` are recorded but refund nothing.

// The day transfer refunds ship, a document about card payments asserts a
// falsehood about a topic it never described. The error is invisible from both
// sides: nobody editing transfers opens this file, and nobody reading this file
// suspects its claim about transfers is stale.
```

Markers worth catching in review: "currently", "at the moment", "for now",
"so far", "not yet", "will be", "in the future", "planned", "temporary",
"TODO", and coverage superlatives such as "the only type that".

These markers flag sentences for inspection; they do not condemn them. What
decides is whether the sentence *asserts a fact with an expiry date*. A design
suggestion that sketches a direction -- "a list for the user to choose from
could appear here later" -- asserts nothing about the state of the build, so
there is nothing in it to go stale; it is design input, written in the register
described under "Tone: constraints vs. suggestions". A sentence reporting where
the implementation stands -- "the server does not currently expose such an
endpoint" -- asserts something that a single commit can falsify, about a part
of the system this document does not specify. Keep the first kind, cut the
second.

Three ways out, in order of preference:

- **Delete it.** The claim is about another topic. The spec that owns that topic
  states its own rules; this one does not need to speak for it.
- **Restate it timelessly** as a rule of the system. "Refunds are defined per
  payment method; a method with no defined rule refunds nothing" stays true
  whether or not transfer refunds exist.
- **Move it** to the backlog or roadmap, where keeping it current is someone's job.

A permanent limitation is not a status claim and may stay, provided it is written
as a rule rather than as a progress report: "partial refunds apply only to card
payments" is a fact about the design, not about the sprint.

---

## Completeness over brevity

Do not condense sentences at the cost of useful information. Two versions of
the same fact may have identical logical meaning but very different informational
value:

```
// BAD -- over-condensed, loses context
On a tie, priority defined in the template determines the order.

// GOOD -- answers: when, exactly what, source, why
When two templates match with the same number of context segments (a tie), one
of them is still selected based on the priority defined when the template was
created, ensuring the same template is chosen every time the same order is processed.
```

Every sentence should answer at least one question: what, when, why, how,
for whom, what are the exceptions.

This governs sentences, not scope, and the difference decides how a spec ages.
Completeness is owed **within one aspect**; it is never a licence for the document to
grow. When a spec starts running long, the answer is not to condense its sentences -- it
is to notice that a second aspect has moved in, and to give that aspect its own document.
A long spec is not a thorough one; it is two specs sharing a file, and it disables the
lifecycle rules at the end of this document.

---

## Rewriting an existing spec: copy first, cut deliberately

A spec is the foundation the rest of the system reads. It is the one document where
saving context costs far more than it saves, because the words **are** the resolution.
Condensing a spec does not make it cheaper to read; it makes every reader reconstruct
what was removed, and some of them reconstruct it wrong.

So a format change, a rename, or a split is never an occasion to improve the prose:

- **Start from a byte-for-byte copy**, never a blank file. `git mv` the document, or
  extract its sections mechanically. Retyping a section from memory silently rewrites it.
- **Change only what the change makes false.** A new separator, a renamed term, a fact
  that is now different. A sentence that is still true stays exactly as it is, however
  long it looks.
- **Every deletion is a separate decision with its own reason**, stated out loud - never
  a by-product of rewriting.
- **Splitting a document is moving text, not re-authoring it.** Two documents out, the
  same sentences in.

Verify with a word count. Sections that only moved should carry their words with them;
a split that comes out 25% shorter did not tighten anything, it dropped material nobody
decided to drop.

The failure mode has a signature: the writer applies "does this sentence earn its place?"
to **themselves** rather than to the reader. Already knowing what `ETA` means makes the
sentence defining `ETA` look redundant - and deleting it removes the only place in the
system where anyone could have learned it. Brevity instincts govern conversation. They
do not govern this file.

---

## Always use complete, realistic examples

Code block examples must be complete. If the system has three parts, the example
shows three parts. No ellipses where the reader might have doubts about the format.

```
// BAD -- incomplete example
order-shipped

// GOOD -- full key with all parts
order-shipped::email::express.gift.first-order
```

Use inline comments in code blocks to explain each line separately, especially
when lines differ from each other in a meaningful way:

```
order-shipped::email::express.gift   <- two context segments: express delivery
                                        of a gift order
order-shipped::email::express        <- one segment: express delivery
order-shipped::email                 <- no context: base template for the channel
order-shipped                        <- ALL key: minimum key sufficient to send anything
```

**Complete format, not maximal content.** "Complete" means the example shows the
structure faithfully -- all mandatory parts, no misleading ellipsis. It does NOT mean
every optional or config-dependent element must appear. Where parts are optional (e.g.
context segments that depend on what a template enables -- delivery speed, gift wrapping,
first order are optional, driven by what the author configured), a small example with one
segment is a valid,
complete illustration of that case, not an "incomplete" key. Keep teaching examples
simple: a low entry threshold serves the human reader, and a spec is for people too. Show
the maximal, exhaustive form in exactly one place (the algorithm or output walkthrough)
and let format-teaching examples stay small. Do not "fix" a deliberately simple example by
inflating it to the maximal case.

---

## Tables for value sets with descriptions

Document enums and value sets with a table, not just a code block:

```
// BAD -- loses the meaning of each value
EARLY, ON_TIME, LATE

// GOOD
| Code      | Meaning                        |
|-----------|--------------------------------|
| EARLY     | before the promised date       |
| ON_TIME   | on the promised date           |
| LATE      | after the promised date        |
```

Exception: if values are self-explanatory and need no description, a code
block is sufficient.

---

## Design decisions section

Every specification for a non-trivial format must include a section explaining
why the format looks the way it does. This is not optional.

Design decisions explain why simpler alternatives were rejected, help future
maintainers understand intent, and prevent "fixing" things that were intentional.

For arguments about scale and complexity, use concrete numbers:

```
// BAD -- abstract argument without numbers
Combining all attributes into one key would lead to too many combinations.

// GOOD -- concrete numbers make the argument
Recording 6 ranked attributes and the state of each in a single key requires
encoding both the ordering of 6 attributes and one of 3 states for each:
6! x 3^6 = 720 x 729 = 524,880 possible variants. A separate subsection per
attribute reduces this to 6! x 3 = 2,160.
```

---

## Document the algorithm, not just the format

A format specification without an algorithm description is incomplete. Always
document how the system builds a key, how it looks up an entry, and what happens
when no entry exists (fallback).

Show a concrete example of stepping through the algorithm with annotations:

```
order has context [express, gift, first-order]:

...::express.gift.first-order.b2b   <- 4 segments, skipped (order has only 3)
...::express.gift.first-order       <- 3 segments, match!
...::express.gift                   <- 2 segments
...::express                        <- 1 segment
...                                 <- ALL fallback
```

---

## Minimum and maximum counts

For key systems, schemas and configurations, always calculate and state:

- **maximum** -- how many possible entries exist (what the system may look up)
- **minimum** -- how many entries are needed for full coverage

Show the formula and a numeric example. The person implementing a dictionary
or configuration must know the order of magnitude of effort to expect.

---

## Section hierarchy matches logical hierarchy

A section must be nested where it logically belongs. If element A is part of
concept B, its description goes under section B, even if it would be more
convenient to place it elsewhere.

---

## Consistent terminology

Define a term once, then use it consistently throughout. Do not refer to the
same concept by different names in different sections. Define new terms at
first use, either in parentheses or in a dedicated sentence.

---

## Tone: constraints vs. suggestions

Not everything in a spec carries the same authority. Distinguish clearly between two kinds of content:

**Server constraints** -- facts about how the system behaves: API contract, data format, validation rules, algorithm steps. These are not negotiable. Write them definitively: "the key contains", "the server returns", "fallback finds the first entry whose context segments are a subset". No hedging.

**UI/UX suggestions** -- observations about how an interface could work to serve its users well. These are input for a designer, not a blueprint to follow literally. Write them as possibilities: "could expose", "is worth showing", "one approach is". Heavy imperatives ("must show", "has to group", "should display") in this context don't describe reality -- they just constrain creative space without reason.

The subtle difference: a spec that says "the server returns `status` as a string" leaves no room for interpretation and shouldn't. A spec that says "the UI must group templates by channel" does leave room -- and pretending otherwise crowds out the designer's judgment about what actually serves the user.

---

## Impersonal register, not second person

A spec is a professional reference document: it describes how the system behaves and how its data is read, in an impersonal register. Do not address the reader in the second person ("you read the state from", "you distinguish by `published`", "you send `parentId`"). Prefer the passive or an impersonal subject: "the state is read from", "the two states are distinguished by `published`", "a request with `parentId`". This keeps the register consistent with the definitive, contract-stating voice of the rest of the document and reads as a specification rather than a tutorial.

Reserve bare imperatives ("cancel publication first, then delete") for genuine ordered procedures where a step list is the natural form. For a plain contract fact, state it impersonally ("deletion of a published article is rejected; publication must be cancelled first") rather than instructing the reader.

---

## One paragraph, one idea

Each paragraph makes one point or describes one concept. If a paragraph does
two things at once, split it. Write paragraphs in .md as continuous lines
without manual line breaks -- the renderer wraps automatically. Do not wrap
prose at a fixed column width; it renders correctly in all environments only
when lines flow freely.

---

## Source encoding and style

No non-ASCII characters anywhere in the document -- not in prose, not in code
blocks, not in comments. Use ASCII equivalents:

- `->` not `→`
- `--` not `—`
- `>=` not `≥`
- straight quotes not curly quotes

The same rule applies to all source files in the project; see the `code-style`
skill for the full list.

---

## Typical document structure

1. **Purpose** -- why this format exists, what problem it solves
2. **Format / Structure** -- syntax, separators, high-level overview
3. **Components** -- each part separately with complete examples
4. **Algorithm** -- how the system builds and looks up (with a walkthrough example)
5. **Special cases** -- cross-section keys, edge cases, ALL fallback
6. **Design decisions** -- why this way and not another, with numbers
7. **Naming conventions** -- code and prefix conventions
8. **Minimum and estimates** -- implementation effort for whoever fills the dictionary

Sections 6-8 are most often skipped in first drafts and most valuable
for the long-term maintainability of the document.

---

## Spec file lifecycle

**One aspect per spec, and this is the precondition for everything else here.** Each spec
covers one aspect of the system and is self-contained -- a reader must not need to open
another spec to understand it.

That is not a style preference. A spec covering a dozen aspects makes every rule below
unusable: revising three sentences would mean writing a new document of several hundred
lines, which nobody does, so the author edits in place instead -- and editing in place is
precisely what produces the silent contradictions these rules exist to prevent. The
failure is recognisable: two sections of one long document disagreeing about the same
fact, each correct on the day it was written, spotted by an implementer rather than by
the author. **If specs keep getting edited despite the rule below, the size is wrong, not
the rule.**

A workable ceiling is a document that can be read in one sitting and reviewed in one diff
-- around a hundred lines. Past that, ask which two topics are sharing a file.

**Numbering.** Each new spec gets the next sequential number. Numbers are never reused.
The number records when a topic entered the contract, not what the topic is; grouping by
subject belongs in an index, which is the one document allowed to point at the others.

**No edits to existing specs.** When understanding of a topic evolves, write a new spec
with the next number rather than modifying the old one. The old one stays unchanged.

This is the default, not an absolute. It exists to prevent silent contradictions --
two specs disagreeing on the same fact with no record of which one is current. A small,
purely additive change (a new field in an existing table, one more row in an existing
enum) doesn't create that risk: nothing already written becomes wrong, there's just more
of it. Editing the existing spec in place is reasonable there, rather than spinning up a
whole new numbered file for one row. When it's unclear which case applies -- whether the
change is genuinely additive or actually revises something -- ask rather than assume.

**Boundaries instead of references.** Do not point at another spec, and do not copy one
either. A pointer promises that something sits at an address, and breaks when it moves. A
copy promises that content is current, and lies the moment the original changes. Both
obligations cost more than they are worth, and copying does not even buy what it claims:
if a shared rule is restated in five documents, changing it forces five rewrites of
documents whose own subject did not change. That is the same coupling a pointer creates,
paid in rewriting instead of in link-following.

Two cases, treated differently:

- **The claim of this document rests on the constraint.** Restate the constraint in one
  sentence, without its reasoning. A timestamp format the algorithm must satisfy is a
  precondition of that algorithm, not a quotation of somebody else's spec. Test: if
  removing the sentence makes this document's claim unverifiable, it belongs here. When
  such a constraint later changes, every document restating it *should* be rewritten --
  their claims genuinely changed, so that is the real radius of the change, not a tax.
- **The topic merely touches this one.** Write that it is **not the subject of this
  specification**. This promises nothing about where the topic lives, or whether it is
  written down at all, so there is nothing to break; and it tells the reader the omission
  is deliberate rather than an oversight, which is the distinction most specs leave
  unmade.

Reasoning has exactly one home. A constraint may appear in several documents; the
paragraph explaining why it holds appears in one.

This is also what keeps deletion cheap. Under full duplication, retiring a spec means
re-reading every other spec to work out which passages were copies and which were
originals. With restated constraints and stated boundaries, that question never arises.

**Deletion over contradiction.** If a new spec contradicts an existing one on the same topic,
delete the old spec -- do not keep two conflicting documents. Before deleting, verify the new
spec has absorbed all non-contradicting content from the old one. The goal is zero information
loss, not zero file count. Once the new spec is complete, delete the old one.

## The implementation link: `@spec`

Everything above governs pointers *between specs*, where both documents are peers and
both move -- which is why the answer there is a boundary statement rather than a
reference. Code is a different relation: it does not cite a peer, it **implements** a
contract. That link is worth recording, and it is the one pointer that can be made
unable to rot.

The marker is a fixed token so that it can be found mechanically:

```ts
// Template lookup: the full key is tried before any shortened key
// @spec 23
```

Four rules make it work:

- **One direction only.** Code names the spec; a spec never names a file, a function or
  a module. The moment a spec points back, it stops being self-contained and starts
  breaking every time the code is reorganised -- which is exactly what the boundary rule
  above prevents. The asymmetry is the design, not an omission.
- **At the definition, not at every use.** The enum, the type, the domain entry point the
  contract governs carries the marker once. Sprinkling it across call sites turns a link
  into noise and multiplies what has to be updated.
- **Comments only.** Never inside a user-visible string -- an API description, an error
  message, help text. Those are read by people who cannot open the document, so an
  internal document number is noise at best and a dead end at worst.
- **A repo without the check does not adopt the marker.** This is the load-bearing rule.
  An unverified pointer promises that something sits at an address and decays in silence,
  which is why the rest of this document forbids them. A verified one inverts that: it
  becomes the only reference that *cannot* rot unnoticed, because deleting or renumbering
  a spec turns into a failing test rather than a quiet lie.

The check is small -- scan the sources for `@spec\s+(\d+)` and assert each number
resolves to a document -- and it runs with the ordinary test suite. Keep it
one-directional: verify that every marker resolves, and do **not** verify the converse,
that every spec is referenced somewhere. A contract is often spread across many files,
so demanding a marker per spec turns into bookkeeping that people satisfy by adding
markers rather than by writing code.

**The index is the only document that points.** Once specs are numbered by arrival rather
than by subject, a directory listing no longer says where anything is, so one document
carries that job: one line per spec, grouped by subject, in reading order, naming who
needs which. It is the single place a reader is sent to, and the single place a stale
pointer can exist -- which is what makes it maintainable, since one document that must be
current beats a dozen cross-references that must all be.

The index does not describe the specs, it locates them. A line long enough to paraphrase
the document is a line that will contradict it.

Stability needs no marking here. A topic that has been superseded three times this month
shows that in the numbering; one whose document has not changed since it was written
shows that too. A badge saying "stable" or "draft" is a claim someone has to maintain,
and it drifts the moment they forget; the history is a measurement and cannot.
