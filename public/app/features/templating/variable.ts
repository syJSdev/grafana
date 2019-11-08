import _ from 'lodash';
import { assignModelProperties } from 'app/core/utils/model_utils';
import { store } from '../../store/store';
import { createVariable, removeVariable, updateVariableProp } from './state/actions';

/*
 * This regex matches 3 types of variable reference with an optional format specifier
 * \$(\w+)                          $var1
 * \[\[([\s\S]+?)(?::(\w+))?\]\]    [[var2]] or [[var2:fmt2]]
 * \${(\w+)(?::(\w+))?}             ${var3} or ${var3:fmt3}
 */
export const variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::(\w+))?}/g;

// Helper function since lastIndex is not reset
export const variableRegexExec = (variableString: string) => {
  variableRegex.lastIndex = 0;
  return variableRegex.exec(variableString);
};

export const SEARCH_FILTER_VARIABLE = '$__searchFilter';
export const containsSearchFilter = (query: string): boolean =>
  query ? query.indexOf(SEARCH_FILTER_VARIABLE) !== -1 : false;

export interface InterpolateSearchFilterOptions {
  query: string;
  options: any;
  wildcardChar: string;
  quoteLiteral: boolean;
}

export const interpolateSearchFilter = (args: InterpolateSearchFilterOptions): string => {
  const { query, wildcardChar, quoteLiteral } = args;
  let { options } = args;

  if (!containsSearchFilter(query)) {
    return query;
  }

  options = options || {};

  const filter = options.searchFilter ? `${options.searchFilter}${wildcardChar}` : `${wildcardChar}`;
  const replaceValue = quoteLiteral ? `'${filter}'` : filter;

  return query.replace(SEARCH_FILTER_VARIABLE, replaceValue);
};

export enum VariableRefresh {
  never,
  onDashboardLoad,
  onTimeRangeChanged,
}

export enum VariableHide {
  dontHide,
  hideVariable,
  hideLabel,
}

export enum VariableSort {
  disabled,
  alphabeticalAsc,
  alphabeticalDesc,
  numericalAsc,
  numericalDesc,
  alphabeticalCaseInsensitiveAsc,
  alphabeticalCaseInsensitiveDesc,
}

export interface VariableTag {
  text: string | string[];
}

export interface VariableOption {
  selected: boolean;
  text: string | string[];
  value: string | string[];
  isNone?: boolean;
}

export type VariableType = 'query' | 'adhoc' | 'constant' | 'datasource' | 'interval' | 'textbox' | 'custom';

export interface AdHocVariableFilter {
  key: string;
  operator: string;
  value: string;
  condition: string;
}

export interface AdHocVariableModel extends VariableModel {
  datasource: string;
  filters: AdHocVariableFilter[];
}

export interface CustomVariableModel extends VariableWithOptions {
  allValue: string;
  includeAll: boolean;
  multi: boolean;
}

export interface DataSourceVariableModel extends VariableWithOptions {
  includeAll: boolean;
  multi: boolean;
  refresh: VariableRefresh;
  regex: string;
}

export interface IntervalVariableModel extends VariableWithOptions {
  auto: boolean;
  auto_min: string;
  auto_count: number;
  refresh: VariableRefresh;
}

export interface QueryVariableModel extends VariableWithOptions {
  allValue: string;
  datasource: string;
  definition: string;
  includeAll: boolean;
  multi: boolean;
  refresh: VariableRefresh;
  regex: string;
  sort: VariableSort;
  tags: VariableTag[];
  tagsQuery: string;
  tagValuesQuery: string;
  useTags: boolean;
}

export interface TextBoxVariableModel extends VariableWithOptions {}

export interface ConstantVariableModel extends VariableWithOptions {}

export interface VariableWithOptions extends VariableModel {
  current: VariableOption;
  options: VariableOption[];
  query: string;
}

export interface VariableModel {
  id?: number;
  type: VariableType;
  name: string;
  label: string;
  hide: VariableHide;
  skipUrlSync: boolean;
  useTemporary?: boolean;
  temporary?: VariableModel;
}

export interface VariableActions {
  setValue(option: any): any;
  updateOptions(searchFilter?: string): any;
  dependsOn(variable: any): any;
  setValueFromUrl(urlValue: any): any;
  getValueForUrl(): any;
  getSaveModel(): any;
}

export const createVariableInState = <T extends VariableModel = VariableModel>(model: T, defaults: T): number => {
  store.dispatch(createVariable({ model, defaults }));
  return store.getState().templating.lastId;
};

export const removeVariableFromState = (id: number) => {
  store.dispatch(removeVariable({ id }));
};

export const getVariablePropFromState = <T>(id: number, temporary: VariableModel, propName: string): T => {
  if (temporary) {
    return (temporary as any)[propName] as T;
  }
  const model: any = store.getState().templating.variables[id];
  return model[propName];
};

export const setVariablePropInState = <T>(id: number, temporary: VariableModel, propName: string, value: T) => {
  if (temporary) {
    (temporary as any)[propName] = value;
    return;
  }
  store.dispatch(updateVariableProp({ id, propName, value }));
};

const stripIdFromVariable = <T extends VariableModel = VariableModel>(variable: T): Omit<T, 'id'> => {
  const { id, ...rest } = variable;
  return rest;
};

export const getVariableModel = <T extends VariableModel = VariableModel>(id: number, temporary: T): Omit<T, 'id'> => {
  if (temporary) {
    return stripIdFromVariable(temporary);
  }
  return stripIdFromVariable(store.getState().templating.variables[id] as T);
};

export type CtorType = new (...args: any[]) => {};

export interface VariableTypes {
  [key: string]: {
    name: string;
    ctor: CtorType;
    description: string;
    supportsMulti?: boolean;
  };
}

export let variableTypes: VariableTypes = {};
export { assignModelProperties };

export function containsVariable(...args: any[]) {
  const variableName = args[args.length - 1];
  args[0] = _.isString(args[0]) ? args[0] : Object['values'](args[0]).join(' ');
  const variableString = args.slice(0, -1).join(' ');
  const matches = variableString.match(variableRegex);
  const isMatchingVariable =
    matches !== null
      ? matches.find(match => {
          const varMatch = variableRegexExec(match);
          return varMatch !== null && varMatch.indexOf(variableName) > -1;
        })
      : false;

  return !!isMatchingVariable;
}
