import { my, BaseContract } from '@antchain/myassembly';
import { Address, Attribute, AttributeType, Collection } from './types';
import { parseHex2Int } from './utils';

export default class CryptoFishContract extends BaseContract {
  // TODO: You can use this hash to verify the image file containing all the fish
  public ruleHash: string = 'xxxxxxxx';
  // CryptoFish standard name
  public standard: string = 'CryptoFish';

  // Collection count limit per address
  private limitPerAddress: i32;
  // CryptoFish contract owner's address
  private owner: Address;
  // Collections list
  private collections: Collection[];

  // Private builtin attributes infos
  private attributeKeyList: AttributeType[];
  private attributes: Map<AttributeType, string>;
  private attributeWeights: Map<AttributeType, u32>;

  constructor() {
    super();
    this.init();
  }

  // TODO: change to private before deploy
  // Init contract, only called when contract is deploying by developer
  public init(): void {
    this.limitPerAddress = 100;
    this.owner = my.getSender().toString(); // Record the contract developer as owner
    this.collections = [];

    // attribute key list depends on rule hash
    this.attributeKeyList = ['skin', 'background', 'frame', 'fin', 'eye', 'tail'];

    // attributes depends on rule hash
    const attributes = new Map<AttributeType, string>();
    attributes.set('skin', '0123456789');
    attributes.set('background', '0123456789ABCDEF');
    attributes.set('frame', '0123456789ABCDEF');
    attributes.set('fin', '0123456789');
    attributes.set('eye', '0123456789');
    attributes.set('tail', '0123456789');
    this.attributes = attributes;

    // `skin/background/frame` has double weights than others when calculating score
    const attributeWeights = new Map<AttributeType, u32>();
    attributeWeights.set('skin', 200);
    attributeWeights.set('background', 200);
    attributeWeights.set('frame', 200);
    attributeWeights.set('fin', 100);
    attributeWeights.set('eye', 100);
    attributeWeights.set('tail', 100);
    this.attributeWeights = attributeWeights;

    this.log(`contract created by: ${this.owner}`);

    // Grant the first(index: 0) collection to our developer.
    this.mint();
  }

  // Mint collection for current address
  public mint(): bool {
    // current address
    const creator = my.getSender().toString();

    // Limit for each address(see `this.limitPerAddress`)
    // Developers are not restricted
    if (creator != this.owner && this.getOwnedCollections().length >= this.limitPerAddress) {
      this.log(`error: you cannot own more than ${this.limitPerAddress} collections(${creator})`);
      return false;
    }

    // generate unique and available attribute
    const attribute = this.generateUniqAttribute();
    const index = this.collections.length; // TODO: needs to lock `this.collections`?

    const collection: Collection = new Map<string, string>();
    collection.set('index', index.toString());
    collection.set('creator', creator);
    collection.set('attribute', attribute);
    collection.set('score', this.calculateScore(attribute).toString());
    collection.set('favorCount', '0');

    this.log(`mint collection success:`);
    this.printCollection(collection);
    this.collections.push(collection);
    return true;
  }

  // Get cryptofish collection by index(u32)
  // "getCollectionByIndex(int)[1]" => "collection(Map<string, string>)"
  public getCollectionByIndex(index: u32): Collection {
    const collection = this.collections[index];
    my.println(`getCollectionByIndex(${index}) => ${collection.get('attribute')}`);
    return collection;
  }

  // Get owned collections
  // "getOwnedCollections()" => "collection[](Array<Map<string, string>>)"
  public getOwnedCollections(): Collection[] {
    const address: string = my.getSender().toString();
    const collections: Collection[] = [];
    for (let index = 0; index < this.collections.length; index += 1) {
      const collection = this.collections[index];
      if (collection.get('creator') != address) continue;
      collections.push(collection);
    }
    this.log(`getOwnedCollections: ${collections.length}`);
    this.printCollections(collections);
    return collections;
  }

  // TODO: Test function, should be removed
  public logAll(): void {
    this.log(`total: ${this.collections.length}`);
    this.printCollections(this.collections);
    this.log(my.getTxHash());
  }

  // Generate unique attribute
  private generateUniqAttribute(): Attribute {
    // TODO: how to generate random and unique attribute
    let seed = 123456;
    while (!this.isAttributeAvailable(seed.toString())) {
      seed += 1;
    }
    return seed.toString();
  }

  // Calculate score by attribute
  private calculateScore(attribute: Attribute): u32 {
    const attrStrList: string[] = attribute.split('');
    const attrU32List: u32[] = attrStrList.map<u32>((hex) => parseHex2Int(hex));
    return attrU32List.reduce<u32>((pv, cv) => pv + cv, 0);
  }

  // Attribute should be available and unique
  private isAttributeAvailable(attribute: Attribute): bool {
    // Should be unique
    for (let index = 0; index < this.collections.length; index += 1) {
      if (this.collections[index].get('attribute') == attribute) return false;
    }

    // Should be contained in attributes range
    const currentAttrList: string[] = attribute.split('');
    const keyList = this.attributeKeyList;
    for (let index = 0; index < keyList.length; index += 1) {
      const attributeRangeString = this.attributes.get(keyList[index]); // such as `0123456789`
      // make sure each attribute's value under the attributes range rule
      if (!attributeRangeString || !attributeRangeString.split('').includes(currentAttrList[index])) {
        this.log(`error: attribute(${attribute}) is not available(${keyList[index]}: ${attributeRangeString})`);
        return false;
      }
    }

    // Congratulations! Your generated attribute is available.
    return true;
  }

  // Print collections to stdout
  private printCollections(c: Collection[]): void {
    for (let index = 0; index < c.length; index += 1) {
      this.printCollection(c[index]);
    }
  }

  // Print collection to stdout
  private printCollection(c: Collection): void {
    const index = c.get('index');
    if (!index) {
      this.log('error: collection not found');
    }
    const creator = c.get('creator');
    const attribute = c.get('attribute');
    const score = c.get('score');
    const favorCount = c.get('favorCount');
    this.log(
      `Collection{index:${index}, creator:"${creator}", attribute:"${attribute}", score:${score}, favor:${favorCount}}`,
    );
  }

  // Common log method, use [cryptofish] as prefix
  private log(message: string): void {
    my.println(`[cryptofish] ${message}`);
  }
}
